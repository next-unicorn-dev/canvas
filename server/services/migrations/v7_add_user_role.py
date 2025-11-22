import sqlite3

from . import Migration


class V7AddUserRole(Migration):
    version = 7
    description = "Add role column to users table"

    def up(self, conn: sqlite3.Connection) -> None:
        # Add role column to users table with default value 'user'
        conn.execute("""
            ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'
        """)
        
        # Update existing users to have 'user' role if NULL
        conn.execute("""
            UPDATE users SET role = 'user' WHERE role IS NULL
        """)
        
        # Set specific email as admin
        conn.execute("""
            UPDATE users SET role = 'admin' WHERE email = 'suminjs@snu.ac.kr'
        """)

    def down(self, conn: sqlite3.Connection) -> None:
        # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        # This is a simplified rollback - in production, you might want a more sophisticated approach
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users_backup (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                image_url TEXT,
                provider TEXT DEFAULT 'prism',
                created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                last_login TEXT
            )
        """)
        conn.execute("""
            INSERT INTO users_backup 
            SELECT id, username, email, password_hash, image_url, provider, created_at, updated_at, last_login
            FROM users
        """)
        conn.execute("DROP TABLE users")
        conn.execute("ALTER TABLE users_backup RENAME TO users")

