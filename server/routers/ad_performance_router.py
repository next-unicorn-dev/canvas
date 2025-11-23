from fastapi import APIRouter, Header, HTTPException, status
from services.auth_service import auth_service
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/ad-performance", tags=["Ad Performance"])


@router.get("")
async def get_ad_performance(authorization: str = Header(None)):
    """
    광고 성과 데이터 조회
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
    except HTTPException:
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
    
    # TODO: 실제 데이터베이스에서 광고 성과 데이터를 조회하도록 구현
    # 현재는 샘플 데이터를 반환합니다
    campaigns = _generate_sample_campaigns()
    
    total_impressions = sum(c["impressions"] for c in campaigns)
    total_clicks = sum(c["clicks"] for c in campaigns)
    total_conversions = sum(c["conversions"] for c in campaigns)
    total_spent = sum(c["spent"] for c in campaigns)
    
    click_through_rate = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    cost_per_click = (total_spent / total_clicks) if total_clicks > 0 else 0
    cost_per_conversion = (total_spent / total_conversions) if total_conversions > 0 else 0
    
    data = {
        "totalImpressions": total_impressions,
        "totalClicks": total_clicks,
        "totalConversions": total_conversions,
        "totalSpent": total_spent,
        "clickThroughRate": round(click_through_rate, 2),
        "conversionRate": round(conversion_rate, 2),
        "costPerClick": round(cost_per_click, 2),
        "costPerConversion": round(cost_per_conversion, 2),
        "campaigns": campaigns,
    }
    
    return {
        "status": "success",
        "data": data,
    }


def _generate_sample_campaigns() -> List[Dict[str, Any]]:
    """샘플 캠페인 데이터 생성 (개발/테스트용)"""
    platforms = ["Instagram", "Facebook", "Google Ads", "Twitter", "LinkedIn"]
    statuses = ["active", "paused", "completed"]
    
    campaigns = []
    base_date = datetime.now()
    
    for i in range(5):
        start_date = base_date - timedelta(days=random.randint(30, 90))
        end_date = start_date + timedelta(days=random.randint(7, 30))
        
        impressions = random.randint(10000, 100000)
        clicks = random.randint(100, 5000)
        conversions = random.randint(10, 500)
        spent = random.randint(50000, 500000)
        
        campaigns.append({
            "id": f"campaign_{i+1}",
            "name": f"캠페인 {i+1}",
            "platform": random.choice(platforms),
            "impressions": impressions,
            "clicks": clicks,
            "conversions": conversions,
            "spent": spent,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "status": random.choice(statuses),
        })
    
    return campaigns

