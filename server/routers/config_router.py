from fastapi import APIRouter, Request
from services.config_service import config_service
# from tools.video_models_dynamic import register_video_models  # Disabled video models
from services.tool_service import tool_service

router = APIRouter(prefix="/api/config", tags=["Config"])


@router.get("/exists", summary="구성 파일 존재 여부 확인")
async def config_exists():
    """
    구성 파일 존재 여부를 확인합니다.

    Returns:
        dict: exists 필드를 포함하는 딕셔너리
    """
    return {"exists": config_service.exists_config()}


@router.get("", summary="구성 조회")
async def get_config():
    """
    모든 구성을 조회합니다.

    Returns:
        dict: 전체 구성 정보
    """
    return config_service.app_config


@router.post("", summary="구성 업데이트")
async def update_config(request: Request):
    """
    구성을 업데이트합니다.

    Args:
        request: 업데이트할 구성 데이터

    Returns:
        dict: 업데이트 결과
    """
    data = await request.json()
    res = await config_service.update_config(data)

    # 구성 업데이트 후 도구 재초기화
    await tool_service.initialize()
    return res
