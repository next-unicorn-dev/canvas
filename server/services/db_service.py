"""
Database Service - Unified interface for database operations.
Uses SQLAlchemy ORM with PostgreSQL.

Configuration:
- Set DATABASE_URL environment variable:
  DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
"""

# Re-export everything from the new database package
from services.database.service import db_service, DatabaseService
from services.database.connection import (
    DatabaseConnection,
    get_db_session,
    get_session,
)
from services.database.models import (
    Base,
    User,
    AuthToken,
    Canvas,
    ChatSession,
    ChatMessage,
    ComfyWorkflow,
    BrandInfo,
    InstagramToken,
)

__all__ = [
    # Service
    "db_service",
    "DatabaseService",
    # Connection
    "DatabaseConnection",
    "get_db_session", 
    "get_session",
    # Models
    "Base",
    "User",
    "AuthToken",
    "Canvas",
    "ChatSession",
    "ChatMessage",
    "ComfyWorkflow",
    "BrandInfo",
    "InstagramToken",
]
