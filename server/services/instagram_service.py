"""
Instagram Service - Instagram API 연동 서비스

Instagram Graph API를 사용하여 OAuth 인증 및 포스트 업로드를 처리합니다.
"""

import os
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import aiosqlite
from services.db_service import DB_PATH


class InstagramService:
    """Instagram API 연동 서비스"""
    
    # Instagram Graph API 엔드포인트 (Facebook Graph API 사용)
    GRAPH_VERSION = "v18.0"
    BASE_URL = f"https://graph.facebook.com/{GRAPH_VERSION}"
    OAUTH_URL = f"https://www.facebook.com/{GRAPH_VERSION}/dialog/oauth"
    
    def __init__(self):
        # 환경변수에서 Instagram App 설정 가져오기
        self.app_id = os.getenv("INSTAGRAM_APP_ID", "")
        self.app_secret = os.getenv("INSTAGRAM_APP_SECRET", "")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:57988/api/instagram/callback")
        
    def get_authorization_url(self, state: str) -> str:
        """Instagram(Facebook) OAuth 인증 URL 생성"""
        # Graph API 사용을 위한 스코프
        scopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
        return (
            f"{self.OAUTH_URL}"
            f"?client_id={self.app_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&scope={scopes}"
            f"&response_type=code"
            f"&state={state}"
        )
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """인증 코드를 액세스 토큰으로 교환"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                },
            )
            response.raise_for_status()
            return response.json()
    
    async def get_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        """단기 토큰을 장기 토큰으로 교환 (60일 유효)"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token,
                },
            )
            response.raise_for_status()
            return response.json()
    
    async def refresh_long_lived_token(self, access_token: str) -> Dict[str, Any]:
        """장기 토큰 갱신 (60일 연장)"""
        # Graph API에서는 동일한 호출로 갱신 가능
        return await self.get_long_lived_token(access_token)
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Instagram 사용자 정보 가져오기 (Facebook 계정 -> Instagram 계정 조회)"""
        async with httpx.AsyncClient() as client:
            # 1. 연결된 페이지 목록 조회
            pages_response = await client.get(
                f"{self.BASE_URL}/me/accounts",
                params={
                    "access_token": access_token,
                },
            )
            pages_response.raise_for_status()
            pages_data = pages_response.json()
            
            # 2. 첫 번째 페이지에 연결된 인스타그램 비즈니스 계정 ID 조회
            instagram_business_account = None
            if "data" in pages_data and len(pages_data["data"]) > 0:
                page_id = pages_data["data"][0]["id"]
                page_token = pages_data["data"][0].get("access_token", access_token) # 페이지 토큰 사용 권장
                
                # 페이지 정보를 통해 인스타그램 계정 ID 조회
                ig_response = await client.get(
                    f"{self.BASE_URL}/{page_id}",
                    params={
                        "fields": "instagram_business_account",
                        "access_token": page_token,
                    },
                )
                ig_response.raise_for_status()
                ig_data = ig_response.json()
                instagram_business_account = ig_data.get("instagram_business_account")

            if not instagram_business_account:
                raise ValueError("No Instagram Business Account connected to this Facebook Page")

            ig_user_id = instagram_business_account["id"]
            
            # 3. 인스타그램 사용자 정보 조회
            user_response = await client.get(
                f"{self.BASE_URL}/{ig_user_id}",
                params={
                    "fields": "id,username,name,profile_picture_url",
                    "access_token": access_token,
                },
            )
            user_response.raise_for_status()
            return user_response.json()
    
    async def save_token(
        self,
        user_id: str,
        access_token: str,
        expires_in: Optional[int] = None,
        refresh_token: Optional[str] = None,
        instagram_user_id: Optional[str] = None,
        instagram_username: Optional[str] = None,
    ) -> None:
        """Instagram 토큰을 데이터베이스에 저장"""
        expires_at = None
        if expires_in:
            expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO instagram_tokens 
                (user_id, access_token, expires_in, expires_at, refresh_token, 
                 instagram_user_id, instagram_username, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    access_token,
                    expires_in,
                    expires_at,
                    refresh_token,
                    instagram_user_id,
                    instagram_username,
                    datetime.utcnow().isoformat(),
                ),
            )
            await db.commit()
    
    async def get_token(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자의 Instagram 토큰 가져오기"""
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM instagram_tokens WHERE user_id = ?",
                (user_id,),
            )
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None
    
    async def delete_token(self, user_id: str) -> None:
        """사용자의 Instagram 토큰 삭제"""
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "DELETE FROM instagram_tokens WHERE user_id = ?",
                (user_id,),
            )
            await db.commit()
    
    async def is_token_valid(self, user_id: str) -> bool:
        """토큰이 유효한지 확인"""
        token_data = await self.get_token(user_id)
        if not token_data:
            return False
        
        expires_at = token_data.get("expires_at")
        if expires_at:
            try:
                expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expires < datetime.utcnow():
                    return False
            except:
                pass
        
        return True
    
    async def get_valid_token(self, user_id: str) -> Optional[str]:
        """유효한 액세스 토큰 가져오기 (필요시 갱신)"""
        token_data = await self.get_token(user_id)
        if not token_data:
            return None
        
        access_token = token_data.get("access_token")
        expires_at = token_data.get("expires_at")
        
        # 토큰이 만료되었거나 곧 만료될 경우 갱신 시도
        if expires_at:
            try:
                expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                # 만료 7일 전이면 갱신
                if expires < datetime.utcnow() + timedelta(days=7):
                    try:
                        refreshed = await self.refresh_long_lived_token(access_token)
                        await self.save_token(
                            user_id=user_id,
                            access_token=refreshed["access_token"],
                            expires_in=refreshed.get("expires_in"),
                            instagram_user_id=token_data.get("instagram_user_id"),
                            instagram_username=token_data.get("instagram_username"),
                        )
                        return refreshed["access_token"]
                    except:
                        pass
            except:
                pass
        
        return access_token
    
    async def create_media_container(
        self,
        access_token: str,
        image_url: str,
        caption: str,
        ig_user_id: str,
    ) -> Dict[str, Any]:
        """미디어 컨테이너 생성 (이미지 업로드 준비)"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/{ig_user_id}/media",
                    params={
                        "image_url": image_url,
                        "caption": caption,
                        "access_token": access_token,
                    },
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"Instagram API Error: {e.response.text}")
                raise ValueError(f"Instagram API Error: {e.response.text}")
            except Exception as e:
                print(f"Unexpected error in create_media_container: {repr(e)}")
                raise

    
    async def publish_media(self, access_token: str, creation_id: str, ig_user_id: str) -> Dict[str, Any]:
        """미디어 컨테이너를 실제 포스트로 발행"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/{ig_user_id}/media_publish",
                    params={
                        "creation_id": creation_id,
                        "access_token": access_token,
                    },
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"Instagram Publish API Error: {e.response.text}")
                raise ValueError(f"Instagram Publish API Error: {e.response.text}")
            except Exception as e:
                print(f"Unexpected error in publish_media: {repr(e)}")
                raise

    
    async def upload_image(
        self,
        user_id: str,
        image_url: str,
        caption: str,
    ) -> Dict[str, Any]:
        """이미지를 Instagram에 업로드"""
        token_data = await self.get_token(user_id)
        if not token_data:
             raise ValueError("No Instagram token found. Please reconnect your account.")
             
        # 토큰 갱신 로직 (get_valid_token 내장)
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise ValueError("Failed to get valid Instagram token.")

        ig_user_id = token_data.get("instagram_user_id")
        if not ig_user_id:
             raise ValueError("Instagram User ID not found in token data.")
        
        # 1. 미디어 컨테이너 생성
        container = await self.create_media_container(access_token, image_url, caption, ig_user_id)
        creation_id = container["id"]
        
        # 2. 미디어 발행
        result = await self.publish_media(access_token, creation_id, ig_user_id)
        return result
    
    async def get_user_media(
        self,
        user_id: str,
        limit: int = 25,
        after: Optional[str] = None,
    ) -> Dict[str, Any]:
        """사용자의 Instagram 미디어 가져오기"""
        token_data = await self.get_token(user_id)
        if not token_data:
             raise ValueError("No Instagram token found. Please reconnect your account.")

        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise ValueError("Failed to get valid Instagram token.")
            
        ig_user_id = token_data.get("instagram_user_id")
        
        params = {
            "fields": "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count",
            "limit": limit,
            "access_token": access_token,
        }
        
        if after:
            params["after"] = after
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{ig_user_id}/media",
                params=params,
            )
            response.raise_for_status()
            return response.json()
    
    async def get_media_details(
        self,
        user_id: str,
        media_id: str,
    ) -> Dict[str, Any]:
        """특정 미디어의 상세 정보 가져오기"""
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise ValueError("No valid Instagram token found. Please reconnect your account.")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{media_id}",
                params={
                    "fields": "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count,username",
                    "access_token": access_token,
                },
            )
            response.raise_for_status()
            return response.json()


instagram_service = InstagramService()




