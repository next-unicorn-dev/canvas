#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL.

Usage:
    1. Set DATABASE_URL environment variable to your PostgreSQL connection string
    2. Run: python scripts/migrate_to_postgres.py

This script will:
    1. Read all data from SQLite database
    2. Create tables in PostgreSQL (if not exists)
    3. Insert all data into PostgreSQL
    4. Verify the migration
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def parse_datetime(value: str | None) -> datetime | None:
    """Parse datetime string and ensure it's timezone-naive for PostgreSQL."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        # Remove timezone info to make it naive
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        return dt
    except (ValueError, TypeError):
        return None

import aiosqlite
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from services.config_service import USER_DATA_DIR
from services.database.models import (
    Base, User, AuthToken, Canvas, ChatSession, 
    ChatMessage, ComfyWorkflow, BrandInfo, InstagramToken
)

SQLITE_PATH = os.path.join(USER_DATA_DIR, "localmanus.db")


async def get_postgres_url() -> str:
    """Get PostgreSQL URL from environment."""
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set!")
    
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    return url


async def read_sqlite_table(db, table: str) -> list:
    """Read all rows from a SQLite table."""
    db.row_factory = aiosqlite.Row
    cursor = await db.execute(f"SELECT * FROM {table}")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def migrate_users(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate users table."""
    rows = await read_sqlite_table(sqlite_db, "users")
    count = 0
    
    for row in rows:
        user = User(
            id=row["id"],
            username=row["username"],
            email=row["email"],
            password_hash=row.get("password_hash"),
            image_url=row.get("image_url"),
            provider=row.get("provider", "prism"),
            role=row.get("role", "user"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
            last_login=parse_datetime(row.get("last_login")),
        )
        pg_session.add(user)
        count += 1
    
    return count


async def migrate_auth_tokens(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate auth_tokens table."""
    rows = await read_sqlite_table(sqlite_db, "auth_tokens")
    count = 0
    
    for row in rows:
        token = AuthToken(
            token=row["token"],
            user_id=row["user_id"],
            expires_at=parse_datetime(row.get("expires_at")),
            created_at=parse_datetime(row.get("created_at")),
        )
        pg_session.add(token)
        count += 1
    
    return count


async def migrate_canvases(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate canvases table."""
    rows = await read_sqlite_table(sqlite_db, "canvases")
    count = 0
    
    for row in rows:
        canvas = Canvas(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            data=row.get("data"),
            thumbnail=row.get("thumbnail"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
        )
        pg_session.add(canvas)
        count += 1
    
    return count


async def migrate_chat_sessions(sqlite_db, pg_session: AsyncSession, valid_canvas_ids: set) -> int:
    """Migrate chat_sessions table."""
    rows = await read_sqlite_table(sqlite_db, "chat_sessions")
    count = 0
    skipped = 0
    
    for row in rows:
        # Skip if canvas_id doesn't exist (orphan record)
        if row["canvas_id"] not in valid_canvas_ids:
            skipped += 1
            continue
            
        session = ChatSession(
            id=row["id"],
            canvas_id=row["canvas_id"],
            title=row.get("title"),
            model=row.get("model"),
            provider=row.get("provider"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
        )
        pg_session.add(session)
        count += 1
    
    if skipped > 0:
        print(f"    [SKIP] {skipped} orphan sessions (missing canvas)")
    return count


async def migrate_chat_messages(sqlite_db, pg_session: AsyncSession, valid_session_ids: set) -> int:
    """Migrate chat_messages table."""
    rows = await read_sqlite_table(sqlite_db, "chat_messages")
    count = 0
    skipped = 0
    
    for row in rows:
        # Skip if session_id doesn't exist (orphan record)
        if row["session_id"] not in valid_session_ids:
            skipped += 1
            continue
            
        message = ChatMessage(
            id=row["id"],
            session_id=row["session_id"],
            role=row["role"],
            message=row.get("message"),
            created_at=parse_datetime(row.get("created_at")),
        )
        pg_session.add(message)
        count += 1
    
    if skipped > 0:
        print(f"    [SKIP] {skipped} orphan messages (missing session)")
    return count


async def migrate_comfy_workflows(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate comfy_workflows table."""
    rows = await read_sqlite_table(sqlite_db, "comfy_workflows")
    count = 0
    
    for row in rows:
        workflow = ComfyWorkflow(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            api_json=row.get("api_json"),
            inputs=row.get("inputs"),
            outputs=row.get("outputs"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
        )
        pg_session.add(workflow)
        count += 1
    
    return count


async def migrate_brand_info(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate brand_info table."""
    rows = await read_sqlite_table(sqlite_db, "brand_info")
    count = 0
    
    for row in rows:
        brand = BrandInfo(
            user_id=row["user_id"],
            name=row.get("name"),
            description=row.get("description"),
            industry=row.get("industry"),
            target_audience=row.get("target_audience"),
            brand_colors=row.get("brand_colors"),
            brand_values=row.get("brand_values"),
            website=row.get("website"),
            social_media=row.get("social_media"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
        )
        pg_session.add(brand)
        count += 1
    
    return count


async def migrate_instagram_tokens(sqlite_db, pg_session: AsyncSession) -> int:
    """Migrate instagram_tokens table."""
    rows = await read_sqlite_table(sqlite_db, "instagram_tokens")
    count = 0
    
    for row in rows:
        token = InstagramToken(
            user_id=row["user_id"],
            access_token=row["access_token"],
            expires_in=row.get("expires_in"),
            expires_at=parse_datetime(row.get("expires_at")),
            refresh_token=row.get("refresh_token"),
            instagram_user_id=row.get("instagram_user_id"),
            instagram_username=row.get("instagram_username"),
            created_at=parse_datetime(row.get("created_at")),
            updated_at=parse_datetime(row.get("updated_at")),
        )
        pg_session.add(token)
        count += 1
    
    return count


async def main():
    print("=" * 60)
    print("SQLite to PostgreSQL Migration Script")
    print("=" * 60)
    
    # Check SQLite file exists
    if not os.path.exists(SQLITE_PATH):
        print(f"[ERROR] SQLite database not found: {SQLITE_PATH}")
        sys.exit(1)
    
    print(f"[INFO] SQLite database: {SQLITE_PATH}")
    
    # Get PostgreSQL URL
    try:
        pg_url = await get_postgres_url()
        print(f"[INFO] PostgreSQL URL: {pg_url[:50]}...")
    except ValueError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    
    # Create PostgreSQL engine
    engine = create_async_engine(pg_url, echo=False)
    
    # Drop and recreate tables (clean migration)
    print("\n[INFO] Dropping existing PostgreSQL tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("[OK] Tables dropped")
    
    print("[INFO] Creating PostgreSQL tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created")
    
    # Create session factory
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Open SQLite and migrate data
    async with aiosqlite.connect(SQLITE_PATH) as sqlite_db:
        async with session_factory() as pg_session:
            print("\n[INFO] Migrating data...")
            
            total = 0
            
            # 1. Migrate users first
            try:
                count = await migrate_users(sqlite_db, pg_session)
                print(f"  [OK] users: {count} rows")
                total += count
            except Exception as e:
                print(f"  [WARN] users: {e}")
            
            # 2. Migrate auth_tokens
            try:
                count = await migrate_auth_tokens(sqlite_db, pg_session)
                print(f"  [OK] auth_tokens: {count} rows")
                total += count
            except Exception as e:
                print(f"  [WARN] auth_tokens: {e}")
            
            # 3. Migrate canvases and collect valid IDs
            valid_canvas_ids = set()
            try:
                rows = await read_sqlite_table(sqlite_db, "canvases")
                for row in rows:
                    valid_canvas_ids.add(row["id"])
                count = await migrate_canvases(sqlite_db, pg_session)
                print(f"  [OK] canvases: {count} rows")
                total += count
            except Exception as e:
                print(f"  [WARN] canvases: {e}")
            
            # 4. Migrate chat_sessions (filter by valid canvas_ids) and collect valid IDs
            valid_session_ids = set()
            try:
                rows = await read_sqlite_table(sqlite_db, "chat_sessions")
                for row in rows:
                    if row["canvas_id"] in valid_canvas_ids:
                        valid_session_ids.add(row["id"])
                count = await migrate_chat_sessions(sqlite_db, pg_session, valid_canvas_ids)
                print(f"  [OK] chat_sessions: {count} rows")
                total += count
            except Exception as e:
                print(f"  [WARN] chat_sessions: {e}")
            
            # 5. Migrate chat_messages (filter by valid session_ids)
            try:
                count = await migrate_chat_messages(sqlite_db, pg_session, valid_session_ids)
                print(f"  [OK] chat_messages: {count} rows")
                total += count
            except Exception as e:
                print(f"  [WARN] chat_messages: {e}")
            
            # 6. Migrate remaining tables
            remaining_migrations = [
                ("comfy_workflows", migrate_comfy_workflows),
                ("brand_info", migrate_brand_info),
                ("instagram_tokens", migrate_instagram_tokens),
            ]
            
            for table, migrate_func in remaining_migrations:
                try:
                    count = await migrate_func(sqlite_db, pg_session)
                    print(f"  [OK] {table}: {count} rows")
                    total += count
                except Exception as e:
                    print(f"  [WARN] {table}: {e}")
            
            # Commit all changes
            await pg_session.commit()
            print(f"\n[OK] Migration complete! Total: {total} rows migrated")
    
    # Close engine
    await engine.dispose()
    print("\n[DONE] Migration finished successfully!")


if __name__ == "__main__":
    asyncio.run(main())

