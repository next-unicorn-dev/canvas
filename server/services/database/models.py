"""
SQLAlchemy ORM Models for database tables.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Text, Integer, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class DBVersion(Base):
    """Database version tracking."""
    __tablename__ = "db_version"
    
    version = Column(Integer, primary_key=True)


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    image_url = Column(Text)
    provider = Column(String(50), default="prism")
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    auth_tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")
    brand_info = relationship("BrandInfo", back_populates="user", uselist=False, cascade="all, delete-orphan")
    instagram_tokens = relationship("InstagramToken", back_populates="user", uselist=False, cascade="all, delete-orphan")


class AuthToken(Base):
    """Authentication tokens."""
    __tablename__ = "auth_tokens"
    
    token = Column(String(255), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="auth_tokens")
    
    __table_args__ = (
        Index("idx_auth_tokens_user_id", "user_id"),
    )


class Canvas(Base):
    """Canvas model."""
    __tablename__ = "canvases"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    data = Column(Text)  # JSON stored as text
    thumbnail = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="canvases")
    chat_sessions = relationship("ChatSession", back_populates="canvas", cascade="all, delete-orphan")


class ChatSession(Base):
    """Chat session model."""
    __tablename__ = "chat_sessions"
    
    id = Column(String(36), primary_key=True)
    canvas_id = Column(String(36), ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    model = Column(String(100))
    provider = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    canvas = relationship("Canvas", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_chat_sessions_canvas_id", "canvas_id"),
    )


class ChatMessage(Base):
    """Chat message model."""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    message = Column(Text)  # JSON stored as text
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    __table_args__ = (
        Index("idx_chat_messages_session_id", "session_id"),
    )


class ComfyWorkflow(Base):
    """ComfyUI workflow model."""
    __tablename__ = "comfy_workflows"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    api_json = Column(Text)  # JSON stored as text
    inputs = Column(Text)  # JSON stored as text
    outputs = Column(Text)  # JSON stored as text
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BrandInfo(Base):
    """Brand information model."""
    __tablename__ = "brand_info"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    name = Column(String(255))
    description = Column(Text)
    industry = Column(String(255))
    target_audience = Column(Text)
    brand_colors = Column(String(255))
    brand_values = Column(Text)
    website = Column(String(500))
    social_media = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="brand_info")


class InstagramToken(Base):
    """Instagram OAuth tokens."""
    __tablename__ = "instagram_tokens"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    access_token = Column(Text, nullable=False)
    expires_in = Column(Integer)
    expires_at = Column(DateTime)
    refresh_token = Column(Text)
    instagram_user_id = Column(String(100))
    instagram_username = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="instagram_tokens")

