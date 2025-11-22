from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr

from services.auth_service import AuthToken, auth_service


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


def _serialize_user(user: dict) -> dict:
    allowed_fields = {
        "id",
        "username",
        "email",
        "image_url",
        "provider",
        "created_at",
        "updated_at",
        "last_login",
        "role",
    }
    return {key: value for key, value in user.items() if key in allowed_fields}


def _serialize_token(token: AuthToken) -> dict:
    return {
        "token": token.token,
        "expires_at": token.expires_at.isoformat(),
    }


@router.post("/register")
async def register(payload: RegisterRequest):
    user, token = await auth_service.register_user(
        username=payload.username.strip(),
        email=str(payload.email).lower(),
        password=payload.password,
    )
    return {
        "status": "success",
        "message": "Registration successful",
        "token": token.token,
        "expires_at": token.expires_at.isoformat(),
        "user_info": _serialize_user(user),
    }


@router.post("/login")
async def login(payload: LoginRequest):
    identifier = payload.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identifier required")

    user, token = await auth_service.authenticate_user(
        identifier=identifier,
        password=payload.password,
    )
    return {
        "status": "success",
        "message": "Login successful",
        "token": token.token,
        "expires_at": token.expires_at.isoformat(),
        "user_info": _serialize_user(user),
    }


@router.get("/status")
async def status_check(authorization: str = Header(None)):
    token = auth_service.extract_token_from_header(authorization)
    user = await auth_service.validate_token(token)
    return {
        "status": "logged_in",
        "is_logged_in": True,
        "user_info": _serialize_user(user),
    }


@router.post("/refresh")
async def refresh(authorization: str = Header(None)):
    token = auth_service.extract_token_from_header(authorization)
    new_token = await auth_service.refresh_token(token)
    return {
        "status": "success",
        "token": new_token.token,
        "expires_at": new_token.expires_at.isoformat(),
    }


@router.post("/logout")
async def logout(authorization: str = Header(None)):
    token = auth_service.extract_token_from_header(authorization)
    await auth_service.logout(token)
    return {
        "status": "success",
        "message": "Logout successful",
    }

