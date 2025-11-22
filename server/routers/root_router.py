import os
from fastapi import APIRouter
import requests
import httpx
from models.tool_model import ToolInfoJson
from services.tool_service import tool_service
from services.config_service import config_service
from services.db_service import db_service
from utils.http_client import HttpClient
# services
from models.config_model import ModelInfo
from typing import List
from services.tool_service import TOOL_MAPPING

router = APIRouter(prefix="/api")


def get_ollama_model_list() -> List[str]:
    base_url = config_service.get_config().get('ollama', {}).get(
        'url', os.getenv('OLLAMA_HOST', 'http://localhost:11434'))
    try:
        response = requests.get(f'{base_url}/api/tags', timeout=5)
        response.raise_for_status()
        data = response.json()
        return [model['name'] for model in data.get('models', [])]
    except requests.RequestException as e:
        print(f"Ollama 조회 오류: {e}")
        return []


async def get_comfyui_model_list(base_url: str) -> List[str]:
    """object_info API에서 ComfyUI 모델 목록을 가져옵니다"""
    try:
        timeout = httpx.Timeout(10.0)
        async with HttpClient.create(timeout=timeout) as client:
            response = await client.get(f"{base_url}/api/object_info")
            if response.status_code == 200:
                data = response.json()
                # CheckpointLoaderSimple 노드에서 모델 추출
                models = data.get('CheckpointLoaderSimple', {}).get(
                    'input', {}).get('required', {}).get('ckpt_name', [[]])[0]
                return models if isinstance(models, list) else []  # type: ignore
            else:
                print(f"ComfyUI 서버가 상태 {response.status_code}를 반환했습니다")
                return []
    except Exception as e:
        print(f"ComfyUI 조회 오류: {e}")
        return []

@router.get("/list_models", summary="모델 목록 조회")
async def get_models() -> list[ModelInfo]:
    """
    사용 가능한 모든 LLM 모델 목록을 조회합니다.

    Returns:
        List[ModelInfo]: 모델 정보 목록
    """
    config = config_service.get_config()
    res: List[ModelInfo] = []

    # Ollama 모델을 별도로 처리
    ollama_url = config.get('ollama', {}).get(
        'url', os.getenv('OLLAMA_HOST', 'http://localhost:11434'))
    # Add Ollama models if URL is available
    if ollama_url and ollama_url.strip():
        ollama_models = get_ollama_model_list()
        for ollama_model in ollama_models:
            res.append({
                'provider': 'ollama',
                'model': ollama_model,
                'url': ollama_url,
                'type': 'text'
            })

    for provider in config.keys():
        if provider in ['ollama']:
            continue

        provider_config = config[provider]
        provider_url = provider_config.get('url', '').strip()
        provider_api_key = provider_config.get('api_key', '').strip()

        # API 키가 비어있으면 프로바이더 건너뛰기
        if not provider_api_key:
            continue
        
        # Google provider는 URL이 없어도 됨 (Vertex AI는 동적 URL 사용)
        if provider != 'google' and not provider_url:
            continue

        models = provider_config.get('models', {})
        for model_name in models:
            model = models[model_name]
            model_type = model.get('type', 'text')
            # 텍스트 모델만 반환
            if model_type == 'text':
                res.append({
                    'provider': provider,
                    'model': model_name,
                    'url': provider_url,
                    'type': model_type
                })
    return res


@router.get("/list_tools", summary="도구 목록 조회")
async def list_tools() -> list[ToolInfoJson]:
    """
    사용 가능한 모든 도구 목록을 조회합니다.

    Returns:
        List[ToolInfoJson]: 도구 정보 목록
    """
    config = config_service.get_config()
    res: list[ToolInfoJson] = []
    for tool_id, tool_info in tool_service.tools.items():
        if tool_info.get('provider') == 'system':
            continue
        provider = tool_info['provider']
        provider_api_key = config[provider].get('api_key', '').strip()
        if provider != 'comfyui' and not provider_api_key:
            continue
        res.append({
            'id': tool_id,
            'provider': tool_info.get('provider', ''),
            'type': tool_info.get('type', ''),
            'display_name': tool_info.get('display_name', ''),
        })

    # ComfyUI 모델을 별도로 처리
    # comfyui_config = config.get('comfyui', {})
    # comfyui_url = comfyui_config.get('url', '').strip()
    # comfyui_config_models = comfyui_config.get('models', {})
    # if comfyui_url:
    #     comfyui_models = await get_comfyui_model_list(comfyui_url)
    #     for comfyui_model in comfyui_models:
    #         if comfyui_model in comfyui_config_models:
    #             res.append({
    #                 'provider': 'comfyui',
    #                 'model': comfyui_model,
    #                 'url': comfyui_url,
    #                 'type': 'image'
    #             })

    return res


@router.get("/list_chat_sessions", summary="채팅 세션 목록 조회")
async def list_chat_sessions():
    """
    모든 채팅 세션 목록을 조회합니다.

    Returns:
        List: 채팅 세션 목록
    """
    return await db_service.list_sessions()


@router.get("/chat_session/{session_id}", summary="채팅 세션 조회")
async def get_chat_session(session_id: str):
    """
    특정 채팅 세션의 대화 기록을 조회합니다.

    Args:
        session_id: 세션 ID

    Returns:
        List: 채팅 메시지 목록
    """
    return await db_service.get_chat_history(session_id)
