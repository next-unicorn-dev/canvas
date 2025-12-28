"""
Database configuration and connection management.
Uses PostgreSQL for all environments.
"""

import os
from urllib.parse import urlparse

# Database URL from environment variable (PostgreSQL required)
DATABASE_URL = os.getenv("DATABASE_URL", "")

def get_database_url() -> str:
    """Get the database URL."""
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL environment variable is required. "
            "Example: DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname"
        )
    return DATABASE_URL

def is_postgresql() -> bool:
    """Check if using PostgreSQL (always True now)."""
    return True
