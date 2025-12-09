"""
Instagram Router - Instagram OAuth 및 업로드 API 엔드포인트
"""

import secrets
import os
from fastapi import APIRouter, HTTPException, status, Header, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from services.instagram_service import instagram_service
from services.auth_service import auth_service

router = APIRouter(prefix="/api/instagram", tags=["instagram"])


class UploadRequest(BaseModel):
    image_url: str
    caption: str
    hashtags: Optional[str] = None
    location: Optional[str] = None


@router.get("/auth/url")
async def get_auth_url(authorization: str = Header(None)):
    """Instagram OAuth 인증 URL 가져오기"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        # CSRF 보호를 위한 state 생성
        state = secrets.token_urlsafe(32)
        # TODO: state를 세션이나 DB에 저장하여 검증
        
        auth_url = instagram_service.get_authorization_url(state)
        return {
            "status": "success",
            "auth_url": auth_url,
            "state": state,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """Instagram OAuth 콜백 처리"""
    if error:
        # 사용자가 인증을 거부한 경우
        return RedirectResponse(
            url=f"/?instagram_auth=error&error={error}",
            status_code=302
        )
    
    try:
        # 1. 인증 코드를 단기 토큰으로 교환
        token_response = await instagram_service.exchange_code_for_token(code)
        short_lived_token = token_response["access_token"]
        
        # 2. 단기 토큰을 장기 토큰으로 교환
        long_lived_response = await instagram_service.get_long_lived_token(short_lived_token)
        long_lived_token = long_lived_response["access_token"]
        expires_in = long_lived_response.get("expires_in", 5184000)  # 60일
        
        # 3. 사용자 정보 가져오기
        user_info = await instagram_service.get_user_info(long_lived_token)
        instagram_user_id = user_info["id"]
        instagram_username = user_info.get("username", "")
        
        # TODO: state에서 user_id 추출 (현재는 임시로 처리)
        # 실제로는 state를 암호화하거나 세션에 저장해야 함
        # 여기서는 프론트엔드에서 user_id를 전달받아야 함
        
        # 프론트엔드 URL 결정 (환경변수 또는 기본값)
        # 개발 환경에서는 React 서버 포트(5174) 사용, 배포 시에는 빈 문자열(상대 경로) 또는 실제 도메인
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        
        return RedirectResponse(
            url=f"{frontend_url}/?instagram_auth=success&token={long_lived_token}&user_id={instagram_user_id}&username={instagram_username}",
            status_code=302
        )
    except Exception as e:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        return RedirectResponse(
            url=f"{frontend_url}/?instagram_auth=error&error={str(e)}",
            status_code=302
        )


@router.post("/connect")
async def connect_instagram(
    request: dict,
    authorization: str = Header(None),
):
    """Instagram 토큰을 저장하여 계정 연결"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        access_token = request.get("access_token")
        instagram_user_id = request.get("instagram_user_id")
        instagram_username = request.get("instagram_username")
        expires_in = request.get("expires_in", 5184000)
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="access_token is required"
            )
        
        await instagram_service.save_token(
            user_id=user_id,
            access_token=access_token,
            expires_in=expires_in,
            instagram_user_id=instagram_user_id,
            instagram_username=instagram_username,
        )
        
        return {
            "status": "success",
            "message": "Instagram account connected successfully",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/status")
async def get_connection_status(authorization: str = Header(None)):
    """Instagram 연결 상태 확인"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        token_data = await instagram_service.get_token(user_id)
        is_connected = token_data is not None
        is_valid = await instagram_service.is_token_valid(user_id) if is_connected else False
        
        return {
            "status": "success",
            "connected": is_connected,
            "valid": is_valid,
            "username": token_data.get("instagram_username") if token_data else None,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/disconnect")
async def disconnect_instagram(authorization: str = Header(None)):
    """Instagram 계정 연결 해제"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        await instagram_service.delete_token(user_id)
        
        return {
            "status": "success",
            "message": "Instagram account disconnected successfully",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/upload")
async def upload_to_instagram(
    request: UploadRequest,
    authorization: str = Header(None),
):
    """이미지를 Instagram에 업로드"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        # 캡션과 해시태그 결합
        caption = request.caption
        if request.hashtags:
            hashtags = " ".join(
                tag if tag.startswith("#") else f"#{tag}"
                for tag in request.hashtags.split()
            )
            caption = f"{caption}\n\n{hashtags}" if caption else hashtags
        
        if request.location:
            caption = f"{caption}\n📍 {request.location}"
        
        result = await instagram_service.upload_image(
            user_id=user_id,
            image_url=request.image_url,
            caption=caption,
        )
        
        return {
            "status": "success",
            "message": "Image uploaded to Instagram successfully",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.get("/media")
async def get_user_media(
    authorization: str = Header(None),
    limit: int = Query(25, ge=1, le=100),
    after: Optional[str] = Query(None),
):
    """사용자의 Instagram 미디어 가져오기"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        result = await instagram_service.get_user_media(
            user_id=user_id,
            limit=limit,
            after=after,
        )
        
        return {
            "status": "success",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get media: {str(e)}"
        )


@router.get("/media/{media_id}")
async def get_media_details(
    media_id: str,
    authorization: str = Header(None),
):
    """특정 미디어의 상세 정보 가져오기"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        result = await instagram_service.get_media_details(
            user_id=user_id,
            media_id=media_id,
        )
        
        return {
            "status": "success",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get media details: {str(e)}"
        )




