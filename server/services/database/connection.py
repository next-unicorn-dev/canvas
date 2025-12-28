"""
Database connection management using PostgreSQL.
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)

from .models import Base

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "")


class DatabaseConnection:
    """Database connection manager for PostgreSQL."""
    
    _engine: Optional[AsyncEngine] = None
    _session_factory: Optional[async_sessionmaker[AsyncSession]] = None
    
    @classmethod
    def get_database_url(cls) -> str:
        """Get the database URL for asyncpg."""
        if not DATABASE_URL:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Example: DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname"
            )
        
        url = DATABASE_URL
        # Convert postgres:// to postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        return url
    
    @classmethod
    async def get_engine(cls) -> AsyncEngine:
        """Get or create the database engine."""
        if cls._engine is None:
            url = cls.get_database_url()
            
            cls._engine = create_async_engine(
                url,
                echo=False,  # Set to True for SQL debugging
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,
            )
        
        return cls._engine
    
    @classmethod
    async def get_session_factory(cls) -> async_sessionmaker[AsyncSession]:
        """Get the session factory."""
        if cls._session_factory is None:
            engine = await cls.get_engine()
            cls._session_factory = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        return cls._session_factory
    
    @classmethod
    async def init_db(cls) -> None:
        """Initialize the database (create tables if they don't exist)."""
        engine = await cls.get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    @classmethod
    async def close(cls) -> None:
        """Close the database connection."""
        if cls._engine:
            await cls._engine.dispose()
            cls._engine = None
            cls._session_factory = None


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a database session."""
    factory = await DatabaseConnection.get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Alias for backward compatibility
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get a database session (alias)."""
    async with get_db_session() as session:
        yield session
