import sqlite3

from . import Migration


class V6AddBrandInfo(Migration):
    version = 6
    description = "Add brand information table"

    def up(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS brand_info (
                user_id TEXT NOT NULL,
                name TEXT,
                description TEXT,
                industry TEXT,
                target_audience TEXT,
                brand_colors TEXT,
                brand_values TEXT,
                website TEXT,
                social_media TEXT,
                created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
                PRIMARY KEY (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_brand_info_user_id ON brand_info(user_id)
            """
        )

    def down(self, conn: sqlite3.Connection) -> None:
        conn.execute("DROP TABLE IF EXISTS brand_info")




