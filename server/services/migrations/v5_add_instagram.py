import sqlite3

from . import Migration


class V5AddInstagram(Migration):
    version = 5
    description = "Add Instagram OAuth tokens table"

    def up(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS instagram_tokens (
                user_id TEXT NOT NULL,
                access_token TEXT NOT NULL,
                token_type TEXT DEFAULT 'Bearer',
                expires_in INTEGER,
                expires_at TEXT,
                refresh_token TEXT,
                instagram_user_id TEXT,
                instagram_username TEXT,
                created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                PRIMARY KEY (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_instagram_tokens_user_id ON instagram_tokens(user_id)
            """
        )

    def down(self, conn: sqlite3.Connection) -> None:
        conn.execute("DROP TABLE IF EXISTS instagram_tokens")





