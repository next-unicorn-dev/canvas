"""
Ad Library Router - API endpoints for Facebook Ad Library integration.
"""

import os
import httpx
import logging
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ad-library", tags=["ad-library"])

# Facebook Ad Library API configuration
FB_GRAPH_API_VERSION = "v21.0"
FB_GRAPH_API_BASE = f"https://graph.facebook.com/{FB_GRAPH_API_VERSION}"


class AdLibrarySearchParams(BaseModel):
    search_terms: Optional[str] = None
    ad_reached_countries: str = "KR"  # Default to South Korea
    ad_type: str = "ALL"  # ALL, POLITICAL_AND_ISSUE_ADS
    ad_active_status: str = "ALL"  # ACTIVE, INACTIVE, ALL
    limit: int = 25
    after: Optional[str] = None  # Pagination cursor


class AdCreative(BaseModel):
    id: str
    body: Optional[str] = None
    title: Optional[str] = None
    link_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class AdData(BaseModel):
    id: str
    ad_creation_time: Optional[str] = None
    ad_delivery_start_time: Optional[str] = None
    ad_delivery_stop_time: Optional[str] = None
    ad_creative_bodies: Optional[List[str]] = None
    ad_creative_link_titles: Optional[List[str]] = None
    ad_creative_link_captions: Optional[List[str]] = None
    ad_creative_link_descriptions: Optional[List[str]] = None
    ad_snapshot_url: Optional[str] = None
    page_id: Optional[str] = None
    page_name: Optional[str] = None
    publisher_platforms: Optional[List[str]] = None
    impressions: Optional[dict] = None
    spend: Optional[dict] = None
    currency: Optional[str] = None
    demographic_distribution: Optional[List[dict]] = None
    delivery_by_region: Optional[List[dict]] = None


class AdLibraryResponse(BaseModel):
    data: List[AdData]
    paging: Optional[dict] = None
    total_count: Optional[int] = None


def get_fb_access_token() -> str:
    """Get Facebook access token from environment variable."""
    token = os.getenv("FB_ACCESS_TOKEN") or os.getenv("FACEBOOK_ACCESS_TOKEN")
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Facebook access token not configured. Please set FB_ACCESS_TOKEN environment variable."
        )
    return token


@router.get("/search", response_model=AdLibraryResponse)
async def search_ads(
    search_terms: Optional[str] = Query(None, description="Search keywords"),
    search_page_ids: Optional[str] = Query(None, description="Comma-separated page IDs to search"),
    ad_reached_countries: str = Query("KR", description="Country code (e.g., KR, US, JP)"),
    ad_type: str = Query("ALL", description="Ad type: ALL, POLITICAL_AND_ISSUE_ADS, HOUSING_ADS, EMPLOYMENT_ADS, FINANCIAL_PRODUCTS_AND_SERVICES_ADS"),
    ad_active_status: str = Query("ALL", description="Status: ACTIVE, INACTIVE, ALL"),
    media_type: Optional[str] = Query(None, description="Filter by media type: ALL, IMAGE, VIDEO, MEME, NONE"),
    languages: Optional[str] = Query(None, description="Language codes (e.g., ko, en, ja)"),
    search_type: str = Query("KEYWORD_UNORDERED", description="KEYWORD_UNORDERED or KEYWORD_EXACT_PHRASE"),
    limit: int = Query(25, ge=1, le=100, description="Number of results per page"),
    after: Optional[str] = Query(None, description="Pagination cursor"),
):
    """
    Search Facebook Ad Library for ads.
    
    Either search_terms or search_page_ids must be provided.
    """
    if not search_terms and not search_page_ids:
        raise HTTPException(
            status_code=400,
            detail="Either search_terms or search_page_ids must be provided"
        )
    
    access_token = get_fb_access_token()
    
    # Base fields available for all ad types
    base_fields = [
        "id",
        "ad_creation_time",
        "ad_delivery_start_time",
        "ad_delivery_stop_time",
        "ad_creative_bodies",
        "ad_creative_link_titles",
        "ad_creative_link_captions",
        "ad_creative_link_descriptions",
        "ad_snapshot_url",
        "page_id",
        "page_name",
        "publisher_platforms",
        "languages",
    ]
    
    # Additional fields only for POLITICAL_AND_ISSUE_ADS
    if ad_type == "POLITICAL_AND_ISSUE_ADS":
        base_fields.extend([
            "impressions",
            "spend",
            "currency",
            "demographic_distribution",
            "delivery_by_region",
            "bylines",
            "estimated_audience_size",
        ])
    
    # Build API request parameters
    # ad_reached_countries must be in array format like ['KR']
    params = {
        "access_token": access_token,
        "ad_reached_countries": f"['{ad_reached_countries}']",
        "ad_type": ad_type,
        "ad_active_status": ad_active_status,
        "search_type": search_type,
        "limit": limit,
        "fields": ",".join(base_fields),
    }
    
    if search_terms:
        params["search_terms"] = search_terms
    
    if search_page_ids:
        params["search_page_ids"] = search_page_ids
    
    if media_type and media_type != "ALL":
        params["media_type"] = media_type
    
    if languages:
        # Convert comma-separated languages to array format
        lang_list = [f"'{lang.strip()}'" for lang in languages.split(",")]
        params["languages"] = f"[{','.join(lang_list)}]"
    
    if after:
        params["after"] = after
    
    # Log the request for debugging
    logger.info(f"Facebook Ad Library API request params: {params}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/ads_archive",
                params=params
            )
            
            logger.info(f"Facebook API response status: {response.status_code}")
            
            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"Facebook API error response: {error_data}")
                error_obj = error_data.get("error", {})
                error_message = error_obj.get("message", "Unknown error")
                error_code = error_obj.get("code", "unknown")
                error_subcode = error_obj.get("error_subcode", "")
                error_type = error_obj.get("type", "")
                
                detail_msg = f"Facebook API error ({error_code}): {error_message}"
                if error_type:
                    detail_msg += f" [Type: {error_type}]"
                if error_subcode:
                    detail_msg += f" [Subcode: {error_subcode}]"
                    
                raise HTTPException(
                    status_code=response.status_code,
                    detail=detail_msg
                )
            
            data = response.json()
            logger.info(f"Facebook API returned {len(data.get('data', []))} ads")
            
            return AdLibraryResponse(
                data=[AdData(**ad) for ad in data.get("data", [])],
                paging=data.get("paging"),
                total_count=len(data.get("data", []))
            )
    
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Facebook API request timed out"
        )
    except httpx.RequestError as e:
        logger.error(f"httpx request error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/page/{page_id}/ads")
async def get_page_ads(
    page_id: str,
    ad_reached_countries: str = Query("KR", description="Country code"),
    ad_active_status: str = Query("ACTIVE", description="Status: ACTIVE, INACTIVE, ALL"),
    limit: int = Query(25, ge=1, le=100),
    after: Optional[str] = Query(None),
):
    """Get all ads from a specific Facebook/Instagram page."""
    return await search_ads(
        search_terms=None,
        search_page_ids=page_id,
        ad_reached_countries=ad_reached_countries,
        ad_type="ALL",
        ad_active_status=ad_active_status,
        media_type=None,
        limit=limit,
        after=after,
    )


@router.get("/countries")
async def get_supported_countries():
    """Get list of supported countries for ad library search."""
    # Common countries for ad library
    countries = [
        {"code": "KR", "name": "대한민국", "name_en": "South Korea"},
        {"code": "US", "name": "미국", "name_en": "United States"},
        {"code": "JP", "name": "일본", "name_en": "Japan"},
        {"code": "CN", "name": "중국", "name_en": "China"},
        {"code": "GB", "name": "영국", "name_en": "United Kingdom"},
        {"code": "DE", "name": "독일", "name_en": "Germany"},
        {"code": "FR", "name": "프랑스", "name_en": "France"},
        {"code": "AU", "name": "호주", "name_en": "Australia"},
        {"code": "CA", "name": "캐나다", "name_en": "Canada"},
        {"code": "BR", "name": "브라질", "name_en": "Brazil"},
        {"code": "IN", "name": "인도", "name_en": "India"},
        {"code": "ID", "name": "인도네시아", "name_en": "Indonesia"},
        {"code": "TH", "name": "태국", "name_en": "Thailand"},
        {"code": "VN", "name": "베트남", "name_en": "Vietnam"},
        {"code": "SG", "name": "싱가포르", "name_en": "Singapore"},
        {"code": "MY", "name": "말레이시아", "name_en": "Malaysia"},
        {"code": "PH", "name": "필리핀", "name_en": "Philippines"},
        {"code": "TW", "name": "대만", "name_en": "Taiwan"},
        {"code": "HK", "name": "홍콩", "name_en": "Hong Kong"},
    ]
    return {"countries": countries}


@router.get("/status")
async def get_ad_library_status():
    """Check if Facebook Ad Library API is configured and accessible."""
    try:
        token = os.getenv("FB_ACCESS_TOKEN") or os.getenv("FACEBOOK_ACCESS_TOKEN")
        if not token:
            return {
                "configured": False,
                "message": "Facebook access token not configured"
            }
        
        # Optionally, we could test the token here by making a simple API call
        return {
            "configured": True,
            "message": "Facebook Ad Library API is configured"
        }
    except Exception as e:
        return {
            "configured": False,
            "message": str(e)
        }

