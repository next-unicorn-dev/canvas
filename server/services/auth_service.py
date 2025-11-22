import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, status

from services.db_service import db_service


TOKEN_TTL_DAYS = 7
PBKDF2_ITERATIONS = 120_000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _format_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _parse_timestamp(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split(":", 1)
    except ValueError:
        return False

    salt = bytes.fromhex(salt_hex)
    expected_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    ).hex()
    return hmac.compare_digest(expected_digest, digest_hex)


@dataclass
class AuthToken:
    token: str
    expires_at: datetime


class AuthService:
    def __init__(self) -> None:
        self.token_ttl = timedelta(days=TOKEN_TTL_DAYS)

    async def register_user(
        self, *, username: str, email: str, password: str
    ) -> Tuple[Dict[str, str], AuthToken]:
        existing_email = await db_service.get_user_by_email(email, include_sensitive=True)
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        existing_username = await db_service.get_user_by_username(
            username, include_sensitive=True
        )
        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

        user_id = str(uuid.uuid4())
        password_hash = hash_password(password)
        now = _format_timestamp(_utcnow())

        await db_service.create_user(
            user_id=user_id,
            username=username,
            email=email,
            password_hash=password_hash,
            provider="prism",
            image_url=None,
            last_login=now,
        )

        await db_service.update_user_login_metadata(user_id, last_login=now)

        auth_token = await self._issue_token(user_id)
        user = await db_service.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User creation failed")
        return user, auth_token

    async def authenticate_user(
        self, *, identifier: str, password: str
    ) -> Tuple[Dict[str, str], AuthToken]:
        if "@" in identifier:
            user_record = await db_service.get_user_by_email(
                identifier, include_sensitive=True
            )
        else:
            user_record = await db_service.get_user_by_username(
                identifier, include_sensitive=True
            )

        if not user_record:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        password_hash = user_record.get("password_hash")
        if not password_hash or not verify_password(password, password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        user_id = user_record["id"]
        await db_service.update_user_login_metadata(user_id, last_login=_format_timestamp(_utcnow()))
        auth_token = await self._issue_token(user_id)
        user_record.pop("password_hash", None)
        return user_record, auth_token

    async def validate_token(self, token: str) -> Dict[str, str]:
        user_record = await db_service.get_user_by_token(token)
        if not user_record:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        expires_at_raw = user_record.pop("expires_at", None)
        if not expires_at_raw:
            await db_service.delete_auth_token(token)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        expires_at = _parse_timestamp(expires_at_raw)
        if expires_at < _utcnow():
            await db_service.delete_auth_token(token)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

        return user_record

    async def refresh_token(self, token: str) -> AuthToken:
        user_record = await db_service.get_user_by_token(token)
        if not user_record:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        expires_at_raw = user_record.get("expires_at")
        if expires_at_raw:
            expires_at = _parse_timestamp(expires_at_raw)
            if expires_at < _utcnow():
                await db_service.delete_auth_token(token)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

        await db_service.delete_auth_token(token)
        return await self._issue_token(user_record["id"])

    async def logout(self, token: str) -> None:
        await db_service.delete_auth_token(token)

    async def _issue_token(self, user_id: str) -> AuthToken:
        token = secrets.token_urlsafe(48)
        expires_at = _utcnow() + self.token_ttl
        await db_service.save_auth_token(token, user_id, _format_timestamp(expires_at))
        return AuthToken(token=token, expires_at=expires_at)

    @staticmethod
    def extract_token_from_header(authorization: Optional[str]) -> str:
        if not authorization:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")
        return token


auth_service = AuthService()

