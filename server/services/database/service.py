"""
Database service with SQLAlchemy ORM using PostgreSQL.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from .connection import DatabaseConnection, get_db_session
from .models import (
    Base, DBVersion, User, AuthToken, Canvas, ChatSession, 
    ChatMessage, ComfyWorkflow, BrandInfo, InstagramToken
)


class DatabaseService:
    """Database service using SQLAlchemy ORM."""
    
    def __init__(self):
        self._initialized = False
    
    async def init(self) -> None:
        """Initialize the database."""
        if self._initialized:
            return
        
        await DatabaseConnection.init_db()
        await self._run_migrations()
        self._initialized = True
    
    async def _run_migrations(self) -> None:
        """Run database migrations if needed."""
        # For SQLAlchemy, we use create_all which handles schema creation
        # For more complex migrations, consider using Alembic
        pass
    
    # ==================== User Operations ====================
    
    async def create_user(
        self,
        *,
        user_id: str,
        username: str,
        email: str,
        password_hash: str,
        image_url: Optional[str] = None,
        provider: str = "prism",
        last_login: Optional[str] = None,
    ) -> None:
        """Create a new user."""
        async with get_db_session() as session:
            # Parse datetime and remove timezone info for PostgreSQL compatibility
            last_login_dt = None
            if last_login:
                last_login_dt = datetime.fromisoformat(last_login)
                if last_login_dt.tzinfo is not None:
                    last_login_dt = last_login_dt.replace(tzinfo=None)
            
            user = User(
                id=user_id,
                username=username,
                email=email,
                password_hash=password_hash,
                image_url=image_url,
                provider=provider,
                last_login=last_login_dt,
            )
            session.add(user)
    
    async def update_user_login_metadata(
        self, user_id: str, *, last_login: Optional[str]
    ) -> None:
        """Update user login metadata."""
        async with get_db_session() as session:
            # Parse datetime and remove timezone info for PostgreSQL compatibility
            last_login_dt = None
            if last_login:
                last_login_dt = datetime.fromisoformat(last_login)
                if last_login_dt.tzinfo is not None:
                    last_login_dt = last_login_dt.replace(tzinfo=None)
            
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    last_login=last_login_dt,
                    updated_at=datetime.utcnow(),
                )
            )
            await session.execute(stmt)
    
    async def get_user_by_email(
        self, email: str, *, include_sensitive: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        async with get_db_session() as session:
            stmt = select(User).where(User.email == email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            return self._user_to_dict(user, include_sensitive)
    
    async def get_user_by_username(
        self, username: str, *, include_sensitive: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        async with get_db_session() as session:
            stmt = select(User).where(User.username == username)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            return self._user_to_dict(user, include_sensitive)
    
    async def get_user_by_id(
        self, user_id: str, *, include_sensitive: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        async with get_db_session() as session:
            stmt = select(User).where(User.id == user_id)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                return None
            
            return self._user_to_dict(user, include_sensitive)
    
    async def list_users(self) -> List[Dict[str, Any]]:
        """List all users (for admin)."""
        async with get_db_session() as session:
            stmt = select(User).order_by(User.created_at.desc())
            result = await session.execute(stmt)
            users = result.scalars().all()
            
            return [self._user_to_dict(user, include_sensitive=False) for user in users]
    
    def _user_to_dict(self, user: User, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert User model to dictionary."""
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "image_url": user.image_url,
            "provider": user.provider,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }
        if include_sensitive:
            data["password_hash"] = user.password_hash
        return data
    
    # ==================== Auth Token Operations ====================
    
    async def save_auth_token(self, token: str, user_id: str, expires_at: str) -> None:
        """Save an auth token."""
        async with get_db_session() as session:
            # Delete existing token if exists
            await session.execute(delete(AuthToken).where(AuthToken.token == token))
            
            # Parse datetime and remove timezone info for PostgreSQL compatibility
            expires_at_dt = datetime.fromisoformat(expires_at)
            if expires_at_dt.tzinfo is not None:
                expires_at_dt = expires_at_dt.replace(tzinfo=None)
            
            auth_token = AuthToken(
                token=token,
                user_id=user_id,
                expires_at=expires_at_dt,
            )
            session.add(auth_token)
    
    async def delete_auth_token(self, token: str) -> None:
        """Delete an auth token."""
        async with get_db_session() as session:
            await session.execute(delete(AuthToken).where(AuthToken.token == token))
    
    async def delete_tokens_for_user(self, user_id: str) -> None:
        """Delete all tokens for a user."""
        async with get_db_session() as session:
            await session.execute(delete(AuthToken).where(AuthToken.user_id == user_id))
    
    async def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user by auth token."""
        async with get_db_session() as session:
            stmt = (
                select(User, AuthToken.expires_at)
                .join(AuthToken, User.id == AuthToken.user_id)
                .where(AuthToken.token == token)
            )
            result = await session.execute(stmt)
            row = result.first()
            
            if not row:
                return None
            
            user, expires_at = row
            data = self._user_to_dict(user, include_sensitive=False)
            data["expires_at"] = expires_at.isoformat() if expires_at else None
            return data
    
    # ==================== Canvas Operations ====================
    
    async def create_canvas(self, id: str, name: str, user_id: Optional[str] = None) -> None:
        """Create a new canvas."""
        async with get_db_session() as session:
            canvas = Canvas(id=id, name=name, user_id=user_id)
            session.add(canvas)
    
    async def list_canvases(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get canvases for a specific user. If user_id is None, returns empty list."""
        async with get_db_session() as session:
            if user_id:
                # Return only canvases belonging to the user
                stmt = select(Canvas).where(Canvas.user_id == user_id).order_by(Canvas.updated_at.desc())
            else:
                # Return empty list for non-authenticated users
                return []
            
            result = await session.execute(stmt)
            canvases = result.scalars().all()
            
            return [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "thumbnail": c.thumbnail,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                }
                for c in canvases
            ]
    
    async def save_canvas_data(self, id: str, data: str, thumbnail: str = None) -> None:
        """Save canvas data."""
        async with get_db_session() as session:
            stmt = (
                update(Canvas)
                .where(Canvas.id == id)
                .values(data=data, thumbnail=thumbnail, updated_at=datetime.utcnow())
            )
            await session.execute(stmt)
    
    async def get_canvas_data(self, id: str) -> Optional[Dict[str, Any]]:
        """Get canvas data."""
        async with get_db_session() as session:
            stmt = select(Canvas).where(Canvas.id == id)
            result = await session.execute(stmt)
            canvas = result.scalar_one_or_none()
            
            if not canvas:
                return None
            
            sessions = await self.list_sessions(id)
            
            return {
                "data": json.loads(canvas.data) if canvas.data else {},
                "name": canvas.name,
                "sessions": sessions,
            }
    
    async def delete_canvas(self, id: str) -> None:
        """Delete canvas and related data."""
        async with get_db_session() as session:
            await session.execute(delete(Canvas).where(Canvas.id == id))
    
    async def rename_canvas(self, id: str, name: str) -> None:
        """Rename canvas."""
        async with get_db_session() as session:
            stmt = update(Canvas).where(Canvas.id == id).values(name=name)
            await session.execute(stmt)
    
    # ==================== Chat Session Operations ====================
    
    async def create_chat_session(
        self, id: str, model: str, provider: str, canvas_id: str, title: Optional[str] = None
    ) -> None:
        """Save a new chat session."""
        async with get_db_session() as session:
            chat_session = ChatSession(
                id=id,
                model=model,
                provider=provider,
                canvas_id=canvas_id,
                title=title,
            )
            session.add(chat_session)
    
    async def create_message(self, session_id: str, role: str, message: str) -> None:
        """Save a chat message."""
        async with get_db_session() as session:
            chat_message = ChatMessage(
                session_id=session_id,
                role=role,
                message=message,
            )
            session.add(chat_message)
    
    async def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session."""
        async with get_db_session() as session:
            stmt = (
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.id.asc())
            )
            result = await session.execute(stmt)
            messages = result.scalars().all()
            
            parsed_messages = []
            for msg in messages:
                if msg.message:
                    try:
                        parsed = json.loads(msg.message)
                        parsed_messages.append(parsed)
                    except json.JSONDecodeError:
                        pass
            
            return parsed_messages
    
    async def list_sessions(self, canvas_id: str) -> List[Dict[str, Any]]:
        """List all chat sessions for a canvas."""
        async with get_db_session() as session:
            if canvas_id:
                stmt = (
                    select(ChatSession)
                    .where(ChatSession.canvas_id == canvas_id)
                    .order_by(ChatSession.updated_at.desc())
                )
            else:
                stmt = select(ChatSession).order_by(ChatSession.updated_at.desc())
            
            result = await session.execute(stmt)
            sessions = result.scalars().all()
            
            return [
                {
                    "id": s.id,
                    "title": s.title,
                    "model": s.model,
                    "provider": s.provider,
                    "created_at": s.created_at.isoformat() if s.created_at else None,
                    "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                }
                for s in sessions
            ]
    
    # ==================== ComfyUI Workflow Operations ====================
    
    async def create_comfy_workflow(
        self, name: str, api_json: str, description: str, inputs: str, outputs: str = None
    ) -> None:
        """Create a new comfy workflow."""
        async with get_db_session() as session:
            workflow = ComfyWorkflow(
                name=name,
                api_json=api_json,
                description=description,
                inputs=inputs,
                outputs=outputs,
            )
            session.add(workflow)
    
    async def list_comfy_workflows(self) -> List[Dict[str, Any]]:
        """List all comfy workflows."""
        async with get_db_session() as session:
            stmt = select(ComfyWorkflow).order_by(ComfyWorkflow.id.desc())
            result = await session.execute(stmt)
            workflows = result.scalars().all()
            
            return [
                {
                    "id": w.id,
                    "name": w.name,
                    "description": w.description,
                    "api_json": w.api_json,
                    "inputs": w.inputs,
                    "outputs": w.outputs,
                }
                for w in workflows
            ]
    
    async def delete_comfy_workflow(self, id: int) -> None:
        """Delete a comfy workflow."""
        async with get_db_session() as session:
            await session.execute(delete(ComfyWorkflow).where(ComfyWorkflow.id == id))
    
    async def get_comfy_workflow(self, id: int) -> Optional[Dict[str, Any]]:
        """Get comfy workflow dict."""
        async with get_db_session() as session:
            stmt = select(ComfyWorkflow).where(ComfyWorkflow.id == id)
            result = await session.execute(stmt)
            workflow = result.scalar_one_or_none()
            
            if not workflow:
                return None
            
            try:
                api_json = workflow.api_json
                if isinstance(api_json, str):
                    return json.loads(api_json)
                return api_json
            except json.JSONDecodeError as exc:
                raise ValueError(f"Stored workflow api_json is not valid JSON: {exc}")
    
    # ==================== Brand Info Operations ====================
    
    async def save_brand_info(self, user_id: str, brand_info: Dict[str, Any]) -> None:
        """Save or update brand information for a user."""
        async with get_db_session() as session:
            # Check if exists
            stmt = select(BrandInfo).where(BrandInfo.user_id == user_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update
                stmt = (
                    update(BrandInfo)
                    .where(BrandInfo.user_id == user_id)
                    .values(
                        name=brand_info.get("name"),
                        description=brand_info.get("description"),
                        industry=brand_info.get("industry"),
                        target_audience=brand_info.get("targetAudience"),
                        brand_colors=brand_info.get("brandColors"),
                        brand_values=brand_info.get("brandValues"),
                        website=brand_info.get("website"),
                        social_media=brand_info.get("socialMedia"),
                        updated_at=datetime.utcnow(),
                    )
                )
                await session.execute(stmt)
            else:
                # Insert
                bi = BrandInfo(
                    user_id=user_id,
                    name=brand_info.get("name"),
                    description=brand_info.get("description"),
                    industry=brand_info.get("industry"),
                    target_audience=brand_info.get("targetAudience"),
                    brand_colors=brand_info.get("brandColors"),
                    brand_values=brand_info.get("brandValues"),
                    website=brand_info.get("website"),
                    social_media=brand_info.get("socialMedia"),
                )
                session.add(bi)
    
    async def get_brand_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get brand information for a user."""
        async with get_db_session() as session:
            stmt = select(BrandInfo).where(BrandInfo.user_id == user_id)
            result = await session.execute(stmt)
            bi = result.scalar_one_or_none()
            
            if not bi:
                return None
            
            return {
                "name": bi.name or "",
                "description": bi.description or "",
                "industry": bi.industry or "",
                "targetAudience": bi.target_audience or "",
                "brandColors": bi.brand_colors or "",
                "brandValues": bi.brand_values or "",
                "website": bi.website or "",
                "socialMedia": bi.social_media or "",
            }
    
    # ==================== Instagram Token Operations ====================
    
    async def save_instagram_token(
        self,
        user_id: str,
        access_token: str,
        expires_in: Optional[int] = None,
        expires_at: Optional[str] = None,
        refresh_token: Optional[str] = None,
        instagram_user_id: Optional[str] = None,
        instagram_username: Optional[str] = None,
    ) -> None:
        """Save or update Instagram token for a user."""
        async with get_db_session() as session:
            # Check if exists
            stmt = select(InstagramToken).where(InstagramToken.user_id == user_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            # Parse datetime and remove timezone info for PostgreSQL compatibility
            expires_at_dt = None
            if expires_at:
                expires_at_dt = datetime.fromisoformat(expires_at)
                if expires_at_dt.tzinfo is not None:
                    expires_at_dt = expires_at_dt.replace(tzinfo=None)
            
            if existing:
                stmt = (
                    update(InstagramToken)
                    .where(InstagramToken.user_id == user_id)
                    .values(
                        access_token=access_token,
                        expires_in=expires_in,
                        expires_at=expires_at_dt,
                        refresh_token=refresh_token,
                        instagram_user_id=instagram_user_id,
                        instagram_username=instagram_username,
                        updated_at=datetime.utcnow(),
                    )
                )
                await session.execute(stmt)
            else:
                token = InstagramToken(
                    user_id=user_id,
                    access_token=access_token,
                    expires_in=expires_in,
                    expires_at=expires_at_dt,
                    refresh_token=refresh_token,
                    instagram_user_id=instagram_user_id,
                    instagram_username=instagram_username,
                )
                session.add(token)
    
    async def get_instagram_token(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get Instagram token for a user."""
        async with get_db_session() as session:
            stmt = select(InstagramToken).where(InstagramToken.user_id == user_id)
            result = await session.execute(stmt)
            token = result.scalar_one_or_none()
            
            if not token:
                return None
            
            return {
                "user_id": token.user_id,
                "access_token": token.access_token,
                "expires_in": token.expires_in,
                "expires_at": token.expires_at.isoformat() if token.expires_at else None,
                "refresh_token": token.refresh_token,
                "instagram_user_id": token.instagram_user_id,
                "instagram_username": token.instagram_username,
            }
    
    async def delete_instagram_token(self, user_id: str) -> None:
        """Delete Instagram token for a user."""
        async with get_db_session() as session:
            await session.execute(
                delete(InstagramToken).where(InstagramToken.user_id == user_id)
            )


# Create singleton instance
db_service = DatabaseService()

