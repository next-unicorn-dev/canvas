from fastapi import APIRouter, Header, HTTPException, status, Query, Body, UploadFile, File, Form
from services.auth_service import auth_service
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import httpx
import os
import json

router = APIRouter(prefix="/api/fb-ads", tags=["Facebook Ads"])

FB_GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


# ============== Pydantic Models ==============

class CampaignCreate(BaseModel):
    name: str
    objective: str  # OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES
    status: str = "PAUSED"  # ACTIVE, PAUSED
    special_ad_categories: List[str] = []  # NONE, EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS
    daily_budget: Optional[int] = None  # 원 단위 (KRW는 cents 개념 없음, USD는 cents)
    lifetime_budget: Optional[int] = None  # 원 단위


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None


class AdSetCreate(BaseModel):
    name: str
    campaign_id: str
    optimization_goal: str  # LINK_CLICKS, REACH, IMPRESSIONS, LANDING_PAGE_VIEWS, etc.
    billing_event: str = "IMPRESSIONS"  # IMPRESSIONS, LINK_CLICKS
    bid_amount: Optional[int] = None  # 원 단위
    daily_budget: Optional[int] = None  # 원 단위 (KRW는 cents 개념 없음)
    lifetime_budget: Optional[int] = None  # 원 단위
    status: str = "PAUSED"
    # Targeting
    targeting_countries: List[str] = ["KR"]  # Country codes
    targeting_age_min: int = 18
    targeting_age_max: int = 65
    targeting_genders: List[int] = [0]  # 0=all, 1=male, 2=female
    # Schedule
    start_time: Optional[str] = None  # ISO format
    end_time: Optional[str] = None


class AdSetUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None
    bid_amount: Optional[int] = None


class AdCreativeCreate(BaseModel):
    name: str
    page_id: str
    message: str  # Primary text
    link: str  # Website URL
    link_headline: Optional[str] = None  # Headline
    link_description: Optional[str] = None  # Description
    call_to_action_type: str = "LEARN_MORE"  # LEARN_MORE, SHOP_NOW, SIGN_UP, CONTACT_US, etc.
    image_hash: Optional[str] = None  # For uploaded images
    image_url: Optional[str] = None  # Or direct URL


class AdCreate(BaseModel):
    name: str
    adset_id: str
    creative_id: Optional[str] = None  # Use existing creative
    # Or create new creative inline
    creative: Optional[AdCreativeCreate] = None
    status: str = "PAUSED"


class AdUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str  # ACTIVE, PAUSED, DELETED


def get_fb_access_token() -> str:
    """Get Facebook access token from environment"""
    token = os.getenv("FB_ACCESS_TOKEN")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Facebook access token not configured"
        )
    return token


@router.get("/accounts")
async def get_ad_accounts(authorization: str = Header(None)):
    """
    연결된 Facebook 광고 계정 목록 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            # 사용자의 광고 계정 목록 가져오기
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/me/adaccounts",
                params={
                    "access_token": fb_token,
                    "fields": "id,name,account_id,account_status,currency,timezone_name,amount_spent"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": data.get("data", [])
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.get("/accounts/{account_id}/insights")
async def get_account_insights(
    account_id: str,
    date_preset: str = Query("last_30d", description="날짜 범위 (last_7d, last_14d, last_30d, last_90d, this_month, last_month)"),
    authorization: str = Header(None)
):
    """
    특정 광고 계정의 인사이트(성과) 데이터 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            # 계정 레벨 인사이트 가져오기
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/insights",
                params={
                    "access_token": fb_token,
                    "date_preset": date_preset,
                    "fields": "impressions,clicks,spend,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            insights = data.get("data", [{}])[0] if data.get("data") else {}
            
            # 데이터 변환
            processed_data = {
                "impressions": int(insights.get("impressions", 0)),
                "clicks": int(insights.get("clicks", 0)),
                "spend": float(insights.get("spend", 0)),
                "reach": int(insights.get("reach", 0)),
                "cpc": float(insights.get("cpc", 0)),
                "cpm": float(insights.get("cpm", 0)),
                "ctr": float(insights.get("ctr", 0)),
                "frequency": float(insights.get("frequency", 0)),
                "actions": insights.get("actions", []),
                "cost_per_action_type": insights.get("cost_per_action_type", [])
            }
            
            return {
                "status": "success",
                "data": processed_data,
                "date_preset": date_preset
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.get("/accounts/{account_id}/campaigns")
async def get_campaigns(
    account_id: str,
    date_preset: str = Query("last_30d"),
    limit: int = Query(50, ge=1, le=100),
    authorization: str = Header(None)
):
    """
    특정 광고 계정의 캠페인 목록과 성과 데이터 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            # 캠페인 목록과 인사이트 가져오기
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/campaigns",
                params={
                    "access_token": fb_token,
                    "limit": limit,
                    "fields": f"id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,insights.date_preset({date_preset}){{impressions,clicks,spend,reach,cpc,cpm,ctr,actions}}"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            campaigns = []
            
            for campaign in data.get("data", []):
                insights = campaign.get("insights", {}).get("data", [{}])[0] if campaign.get("insights") else {}
                
                campaigns.append({
                    "id": campaign.get("id"),
                    "name": campaign.get("name"),
                    "status": campaign.get("status"),
                    "objective": campaign.get("objective"),
                    "created_time": campaign.get("created_time"),
                    "start_time": campaign.get("start_time"),
                    "stop_time": campaign.get("stop_time"),
                    "daily_budget": campaign.get("daily_budget"),
                    "lifetime_budget": campaign.get("lifetime_budget"),
                    "insights": {
                        "impressions": int(insights.get("impressions", 0)),
                        "clicks": int(insights.get("clicks", 0)),
                        "spend": float(insights.get("spend", 0)),
                        "reach": int(insights.get("reach", 0)),
                        "cpc": float(insights.get("cpc", 0)),
                        "cpm": float(insights.get("cpm", 0)),
                        "ctr": float(insights.get("ctr", 0)),
                        "actions": insights.get("actions", [])
                    }
                })
            
            return {
                "status": "success",
                "data": campaigns,
                "date_preset": date_preset
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.get("/accounts/{account_id}/adsets")
async def get_adsets(
    account_id: str,
    campaign_id: Optional[str] = Query(None, description="특정 캠페인의 광고 세트만 조회"),
    date_preset: str = Query("last_30d"),
    limit: int = Query(50, ge=1, le=100),
    authorization: str = Header(None)
):
    """
    광고 세트 목록과 성과 데이터 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "access_token": fb_token,
                "limit": limit,
                "fields": f"id,name,status,campaign_id,daily_budget,lifetime_budget,targeting,optimization_goal,insights.date_preset({date_preset}){{impressions,clicks,spend,reach,cpc,cpm,ctr}}"
            }
            
            if campaign_id:
                params["filtering"] = f'[{{"field":"campaign.id","operator":"EQUAL","value":"{campaign_id}"}}]'
            
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/adsets",
                params=params
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            adsets = []
            
            for adset in data.get("data", []):
                insights = adset.get("insights", {}).get("data", [{}])[0] if adset.get("insights") else {}
                
                adsets.append({
                    "id": adset.get("id"),
                    "name": adset.get("name"),
                    "status": adset.get("status"),
                    "campaign_id": adset.get("campaign_id"),
                    "daily_budget": adset.get("daily_budget"),
                    "lifetime_budget": adset.get("lifetime_budget"),
                    "optimization_goal": adset.get("optimization_goal"),
                    "insights": {
                        "impressions": int(insights.get("impressions", 0)),
                        "clicks": int(insights.get("clicks", 0)),
                        "spend": float(insights.get("spend", 0)),
                        "reach": int(insights.get("reach", 0)),
                        "cpc": float(insights.get("cpc", 0)),
                        "cpm": float(insights.get("cpm", 0)),
                        "ctr": float(insights.get("ctr", 0))
                    }
                })
            
            return {
                "status": "success",
                "data": adsets,
                "date_preset": date_preset
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.get("/accounts/{account_id}/ads")
async def get_ads(
    account_id: str,
    campaign_id: Optional[str] = Query(None),
    adset_id: Optional[str] = Query(None),
    date_preset: str = Query("last_30d"),
    limit: int = Query(50, ge=1, le=100),
    authorization: str = Header(None)
):
    """
    광고 목록과 성과 데이터 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")
    
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "access_token": fb_token,
                "limit": limit,
                "fields": f"id,name,status,campaign_id,adset_id,creative{{id,name,thumbnail_url,object_story_spec}},insights.date_preset({date_preset}){{impressions,clicks,spend,reach,cpc,cpm,ctr,actions}}"
            }
            
            filtering = []
            if campaign_id:
                filtering.append({"field": "campaign.id", "operator": "EQUAL", "value": campaign_id})
            if adset_id:
                filtering.append({"field": "adset.id", "operator": "EQUAL", "value": adset_id})
            if filtering:
                import json
                params["filtering"] = json.dumps(filtering)
            
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/ads",
                params=params
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            ads = []
            
            for ad in data.get("data", []):
                insights = ad.get("insights", {}).get("data", [{}])[0] if ad.get("insights") else {}
                creative = ad.get("creative", {})
                
                ads.append({
                    "id": ad.get("id"),
                    "name": ad.get("name"),
                    "status": ad.get("status"),
                    "campaign_id": ad.get("campaign_id"),
                    "adset_id": ad.get("adset_id"),
                    "creative": {
                        "id": creative.get("id"),
                        "name": creative.get("name"),
                        "thumbnail_url": creative.get("thumbnail_url")
                    },
                    "insights": {
                        "impressions": int(insights.get("impressions", 0)),
                        "clicks": int(insights.get("clicks", 0)),
                        "spend": float(insights.get("spend", 0)),
                        "reach": int(insights.get("reach", 0)),
                        "cpc": float(insights.get("cpc", 0)),
                        "cpm": float(insights.get("cpm", 0)),
                        "ctr": float(insights.get("ctr", 0)),
                        "actions": insights.get("actions", [])
                    }
                })
            
            return {
                "status": "success",
                "data": ads,
                "date_preset": date_preset
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Helper Function for Auth ==============

async def validate_user_auth(authorization: str):
    """Validate user authentication"""
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(e)}")


# ============== Facebook Pages ==============

@router.get("/pages")
async def get_pages(authorization: str = Header(None)):
    """
    연결된 Facebook 페이지 목록 조회 (광고 게재에 필요)
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FB_GRAPH_API_BASE}/me/accounts",
                params={
                    "access_token": fb_token,
                    "fields": "id,name,access_token,category,picture"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Facebook API error")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": data.get("data", [])
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Campaign CRUD ==============

@router.post("/accounts/{account_id}/campaigns")
async def create_campaign(
    account_id: str,
    campaign: CampaignCreate,
    authorization: str = Header(None)
):
    """
    새 캠페인 생성
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "access_token": fb_token,
                "name": campaign.name,
                "objective": campaign.objective,
                "status": campaign.status,
                "special_ad_categories": json.dumps(campaign.special_ad_categories) if campaign.special_ad_categories else "[]"
            }
            
            if campaign.daily_budget:
                payload["daily_budget"] = campaign.daily_budget
            if campaign.lifetime_budget:
                payload["lifetime_budget"] = campaign.lifetime_budget
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/campaigns",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to create campaign")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": data
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    campaign: CampaignUpdate,
    authorization: str = Header(None)
):
    """
    캠페인 수정
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {"access_token": fb_token}
            
            if campaign.name:
                payload["name"] = campaign.name
            if campaign.status:
                payload["status"] = campaign.status
            if campaign.daily_budget:
                payload["daily_budget"] = campaign.daily_budget
            if campaign.lifetime_budget:
                payload["lifetime_budget"] = campaign.lifetime_budget
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{campaign_id}",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update campaign")
                )
            
            return {"status": "success", "message": "Campaign updated"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    authorization: str = Header(None)
):
    """
    캠페인 삭제
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{campaign_id}",
                data={
                    "access_token": fb_token,
                    "status": "DELETED"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to delete campaign")
                )
            
            return {"status": "success", "message": "Campaign deleted"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Ad Set CRUD ==============

@router.post("/accounts/{account_id}/adsets")
async def create_adset(
    account_id: str,
    adset: AdSetCreate,
    authorization: str = Header(None)
):
    """
    새 광고 세트 생성
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            # Build targeting spec
            targeting = {
                "geo_locations": {
                    "countries": adset.targeting_countries
                },
                "age_min": adset.targeting_age_min,
                "age_max": adset.targeting_age_max
            }
            
            if adset.targeting_genders and 0 not in adset.targeting_genders:
                targeting["genders"] = adset.targeting_genders
            
            payload = {
                "access_token": fb_token,
                "name": adset.name,
                "campaign_id": adset.campaign_id,
                "optimization_goal": adset.optimization_goal,
                "billing_event": adset.billing_event,
                "status": adset.status,
                "targeting": json.dumps(targeting)
            }
            
            if adset.bid_amount:
                payload["bid_amount"] = adset.bid_amount
            if adset.daily_budget:
                payload["daily_budget"] = adset.daily_budget
            if adset.lifetime_budget:
                payload["lifetime_budget"] = adset.lifetime_budget
            if adset.start_time:
                payload["start_time"] = adset.start_time
            if adset.end_time:
                payload["end_time"] = adset.end_time
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/adsets",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to create ad set")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": data
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.patch("/adsets/{adset_id}")
async def update_adset(
    adset_id: str,
    adset: AdSetUpdate,
    authorization: str = Header(None)
):
    """
    광고 세트 수정
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {"access_token": fb_token}
            
            if adset.name:
                payload["name"] = adset.name
            if adset.status:
                payload["status"] = adset.status
            if adset.daily_budget:
                payload["daily_budget"] = adset.daily_budget
            if adset.lifetime_budget:
                payload["lifetime_budget"] = adset.lifetime_budget
            if adset.bid_amount:
                payload["bid_amount"] = adset.bid_amount
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{adset_id}",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update ad set")
                )
            
            return {"status": "success", "message": "Ad set updated"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.delete("/adsets/{adset_id}")
async def delete_adset(
    adset_id: str,
    authorization: str = Header(None)
):
    """
    광고 세트 삭제
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{adset_id}",
                data={
                    "access_token": fb_token,
                    "status": "DELETED"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to delete ad set")
                )
            
            return {"status": "success", "message": "Ad set deleted"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Image Upload ==============

@router.post("/accounts/{account_id}/images")
async def upload_ad_image(
    account_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    광고 이미지 업로드
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        # Read file content
        file_content = await file.read()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/adimages",
                data={"access_token": fb_token},
                files={"filename": (file.filename, file_content, file.content_type)}
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to upload image")
                )
            
            data = response.json()
            # Extract image hash from response
            images = data.get("images", {})
            image_info = list(images.values())[0] if images else {}
            
            return {
                "status": "success",
                "data": {
                    "hash": image_info.get("hash"),
                    "url": image_info.get("url"),
                    "name": image_info.get("name")
                }
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Ad Creative ==============

@router.post("/accounts/{account_id}/adcreatives")
async def create_ad_creative(
    account_id: str,
    creative: AdCreativeCreate,
    authorization: str = Header(None)
):
    """
    광고 소재 생성
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            # Build object_story_spec
            link_data = {
                "link": creative.link,
                "message": creative.message,
                "call_to_action": {
                    "type": creative.call_to_action_type,
                    "value": {"link": creative.link}
                }
            }
            
            if creative.link_headline:
                link_data["name"] = creative.link_headline
            if creative.link_description:
                link_data["description"] = creative.link_description
            if creative.image_hash:
                link_data["image_hash"] = creative.image_hash
            elif creative.image_url:
                link_data["picture"] = creative.image_url
            
            object_story_spec = {
                "page_id": creative.page_id,
                "link_data": link_data
            }
            
            payload = {
                "access_token": fb_token,
                "name": creative.name,
                "object_story_spec": json.dumps(object_story_spec)
            }
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/adcreatives",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to create ad creative")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": data
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Ad CRUD ==============

@router.post("/accounts/{account_id}/ads")
async def create_ad(
    account_id: str,
    ad: AdCreate,
    authorization: str = Header(None)
):
    """
    새 광고 생성
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            creative_id = ad.creative_id
            
            # If no creative_id provided but creative spec given, create creative first
            if not creative_id and ad.creative:
                creative_payload = {
                    "access_token": fb_token,
                    "name": ad.creative.name,
                }
                
                # Build object_story_spec
                link_data = {
                    "link": ad.creative.link,
                    "message": ad.creative.message,
                    "call_to_action": {
                        "type": ad.creative.call_to_action_type,
                        "value": {"link": ad.creative.link}
                    }
                }
                
                if ad.creative.link_headline:
                    link_data["name"] = ad.creative.link_headline
                if ad.creative.link_description:
                    link_data["description"] = ad.creative.link_description
                if ad.creative.image_hash:
                    link_data["image_hash"] = ad.creative.image_hash
                elif ad.creative.image_url:
                    link_data["picture"] = ad.creative.image_url
                
                object_story_spec = {
                    "page_id": ad.creative.page_id,
                    "link_data": link_data
                }
                
                creative_payload["object_story_spec"] = json.dumps(object_story_spec)
                
                creative_response = await client.post(
                    f"{FB_GRAPH_API_BASE}/act_{account_id}/adcreatives",
                    data=creative_payload
                )
                
                if creative_response.status_code != 200:
                    error_data = creative_response.json()
                    raise HTTPException(
                        status_code=creative_response.status_code,
                        detail=error_data.get("error", {}).get("message", "Failed to create ad creative")
                    )
                
                creative_data = creative_response.json()
                creative_id = creative_data.get("id")
            
            if not creative_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Either creative_id or creative spec must be provided"
                )
            
            # Create ad
            ad_payload = {
                "access_token": fb_token,
                "name": ad.name,
                "adset_id": ad.adset_id,
                "creative": json.dumps({"creative_id": creative_id}),
                "status": ad.status
            }
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/act_{account_id}/ads",
                data=ad_payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to create ad")
                )
            
            data = response.json()
            return {
                "status": "success",
                "data": {
                    "id": data.get("id"),
                    "creative_id": creative_id
                }
            }
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.patch("/ads/{ad_id}")
async def update_ad(
    ad_id: str,
    ad: AdUpdate,
    authorization: str = Header(None)
):
    """
    광고 수정
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {"access_token": fb_token}
            
            if ad.name:
                payload["name"] = ad.name
            if ad.status:
                payload["status"] = ad.status
            
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{ad_id}",
                data=payload
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update ad")
                )
            
            return {"status": "success", "message": "Ad updated"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.delete("/ads/{ad_id}")
async def delete_ad(
    ad_id: str,
    authorization: str = Header(None)
):
    """
    광고 삭제
    """
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{ad_id}",
                data={
                    "access_token": fb_token,
                    "status": "DELETED"
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to delete ad")
                )
            
            return {"status": "success", "message": "Ad deleted"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


# ============== Bulk Status Update ==============

@router.patch("/campaigns/{campaign_id}/status")
async def update_campaign_status(
    campaign_id: str,
    status_update: StatusUpdate,
    authorization: str = Header(None)
):
    """캠페인 상태 변경 (활성화/일시정지)"""
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{campaign_id}",
                data={
                    "access_token": fb_token,
                    "status": status_update.status
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update status")
                )
            
            return {"status": "success", "message": f"Campaign status updated to {status_update.status}"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.patch("/adsets/{adset_id}/status")
async def update_adset_status(
    adset_id: str,
    status_update: StatusUpdate,
    authorization: str = Header(None)
):
    """광고 세트 상태 변경"""
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{adset_id}",
                data={
                    "access_token": fb_token,
                    "status": status_update.status
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update status")
                )
            
            return {"status": "success", "message": f"Ad set status updated to {status_update.status}"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )


@router.patch("/ads/{ad_id}/status")
async def update_ad_status(
    ad_id: str,
    status_update: StatusUpdate,
    authorization: str = Header(None)
):
    """광고 상태 변경"""
    await validate_user_auth(authorization)
    fb_token = get_fb_access_token()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{FB_GRAPH_API_BASE}/{ad_id}",
                data={
                    "access_token": fb_token,
                    "status": status_update.status
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("error", {}).get("message", "Failed to update status")
                )
            
            return {"status": "success", "message": f"Ad status updated to {status_update.status}"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Facebook API: {str(e)}"
        )
