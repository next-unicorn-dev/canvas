"""
Admin Router - 관리자 라우터 모듈

이 모듈은 관리자 관련 API 라우트 엔드포인트를 제공합니다:
- 유저 목록 조회

주요 엔드포인트:
- GET /api/admin/users - 모든 유저 목록 조회
"""

from fastapi import APIRouter, Header, HTTPException, status
from services.db_service import db_service
from services.auth_service import auth_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _serialize_user(user: dict) -> dict:
    """Serialize user data for API response"""
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


def _check_admin_role(user: dict) -> None:
    """Check if user has admin role"""
    user_role = user.get("role", "user")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.get("/users")
async def list_users(authorization: str = Header(None)):
    """
    Get list of all users (admin only)
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
    except HTTPException:
        # Re-raise HTTPException from extract_token_from_header
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication required: {str(e)}"
        )
    
    try:
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check admin role
        _check_admin_role(user)
    except HTTPException:
        # Re-raise HTTPException as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
    
    users = await db_service.list_users()
    return {
        "status": "success",
        "users": [_serialize_user(user) for user in users],
        "total": len(users),
    }

