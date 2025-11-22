"""
Settings Router - 설정 라우터 모듈

이 모듈은 설정 관련 API 라우트 엔드포인트를 제공합니다:
- 설정 파일 존재 여부 확인
- 설정 조회 및 업데이트
- 프록시 설정 관리
- 프록시 연결 테스트

주요 엔드포인트:
- GET /api/settings/exists - 설정 파일 존재 여부 확인
- GET /api/settings - 모든 설정 조회 (민감 정보 마스킹됨)
- POST /api/settings - 설정 업데이트
- GET /api/settings/proxy/status - 프록시 상태 조회
- GET /api/settings/proxy/test - 프록시 연결 테스트
- GET /api/settings/proxy - 프록시 설정 조회
- POST /api/settings/proxy - 프록시 설정 업데이트
- GET /api/settings/knowledge/enabled - 활성화된 지식 베이스 목록 조회
의존 모듈:
- services.settings_service - 설정 서비스
- services.db_service - 데이터베이스 서비스
- services.config_service - 구성 서비스
- services.knowledge_service - 지식 베이스 서비스
"""

import json
import os
import shutil
import httpx
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Header
from services.db_service import db_service
from services.settings_service import settings_service
from services.tool_service import tool_service
from services.knowledge_service import list_user_enabled_knowledge
from services.auth_service import auth_service
from pydantic import BaseModel

# 설정 관련 라우터 생성, 모든 엔드포인트는 /api/settings 접두사 사용
router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/exists", summary="설정 파일 존재 여부 확인")
async def settings_exists():
    """
    설정 파일 존재 여부를 확인합니다.

    Returns:
        dict: exists 필드를 포함하는 딕셔너리, 설정 파일 존재 여부를 나타냅니다

    Description:
        프론트엔드에서 초기 설정 마법사 표시 여부를 확인하는 데 사용됩니다.
        설정 파일이 없으면 일반적으로 사용자에게 초기 구성을 안내합니다.
    """
    return {"exists": await settings_service.exists_settings()}


@router.get("", summary="모든 설정 조회")
async def get_settings():
    """
    모든 설정 구성을 조회합니다.

    Returns:
        dict: 전체 설정 구성 딕셔너리, 민감 정보는 마스킹 처리됨

    Description:
        프록시 설정, 시스템 프롬프트 등 모든 앱 설정을 반환합니다.
        민감한 정보(비밀번호 등)는 '*' 문자로 대체되어 개인정보가 보호됩니다.
        설정은 기본 구성과 병합되어 모든 필수 키가 존재하는지 확인합니다.
    """
    return settings_service.get_settings()


@router.post("", summary="설정 업데이트")
async def update_settings(request: Request):
    """
    설정 구성을 업데이트합니다.

    Args:
        request (Request): 업데이트할 설정 데이터를 포함하는 HTTP 요청 객체

    Returns:
        dict: status와 message 필드를 포함하는 작업 결과

    Description:
        JSON 형식의 설정 데이터를 받아 설정 파일에 업데이트합니다.
        부분 업데이트를 지원하며, 새 데이터는 기존 설정과 병합됩니다 (완전히 교체되지 않음).

    Example:
        POST /api/settings
        {
            "proxy": "http://proxy.com:8080"  // 또는 "no_proxy" 또는 "system"
        }
    """
    data = await request.json()
    result = await settings_service.update_settings(data)
    return result


@router.get("/proxy/status", summary="프록시 상태 조회")
async def get_proxy_status():
    """
    프록시 설정 상태를 조회합니다.

    Returns:
        dict: 다음 필드를 포함하는 프록시 상태 정보:
            - enable (bool): 프록시 활성화 여부
            - configured (bool): 프록시 구성 여부
            - message (str): 상태 설명 메시지

    Description:
        현재 프록시 설정의 상태를 확인하며, 활성화 여부와 구성 여부를 포함합니다.
        이 엔드포인트는 보안을 위해 전체 프록시 URL을 노출하지 않습니다.

    Status Logic:
        - enable=True, configured=True: 프록시 활성화 및 구성 완료
        - enable=True, configured=False: 프록시 활성화되었으나 구성 오류
        - enable=False, configured=False: 프록시 비활성화
    """
    # 설정에서 프록시 구성 조회
    settings = settings_service.get_raw_settings()
    proxy_setting = settings.get('proxy', 'system')

    if proxy_setting == 'no_proxy':
        # 프록시 사용 안 함
        return {
            "enable": False,
            "configured": True,
            "message": "프록시가 비활성화되었습니다"
        }
    elif proxy_setting == 'system':
        # 시스템 프록시 사용
        return {
            "enable": True,
            "configured": True,
            "message": "시스템 프록시를 사용 중입니다"
        }
    elif proxy_setting.startswith(('http://', 'https://', 'socks4://', 'socks5://')):
        # 지정된 프록시 URL 사용
        return {
            "enable": True,
            "configured": True,
            "message": "사용자 지정 프록시를 사용 중입니다"
        }
    else:
        # 프록시 설정 형식이 잘못됨
        return {
            "enable": True,
            "configured": False,
            "message": "프록시 구성이 유효하지 않습니다"
        }


@router.get("/proxy", summary="프록시 설정 조회")
async def get_proxy_settings():
    """
    프록시 설정을 조회합니다.

    Returns:
        dict: proxy 필드를 포함하는 프록시 설정 딕셔너리

    Description:
        프록시 관련 설정만 반환하며, 다른 설정 항목은 포함하지 않습니다.
        프론트엔드 프록시 설정 페이지의 데이터 로딩에 사용됩니다.

    Response Format:
        {
            "proxy": "no_proxy" | "system" | "http://proxy.example.com:8080"
        }
    """
    proxy_config = settings_service.get_proxy_config()
    return {"proxy": proxy_config}


@router.post("/proxy", summary="프록시 설정 업데이트")
async def update_proxy_settings(request: Request):
    """
    프록시 설정을 업데이트합니다.

    Args:
        request (Request): 프록시 설정 데이터를 포함하는 HTTP 요청 객체

    Returns:
        dict: status와 message 필드를 포함하는 작업 결과

    Raises:
        HTTPException: 프록시 설정 데이터 형식이 잘못되었을 때 400 오류 발생

    Description:
        프록시 관련 설정만 업데이트하며, 다른 설정 항목에는 영향을 주지 않습니다.
        프록시 설정은 "proxy" 키를 포함하는 객체여야 합니다.

    Example:
        POST /api/settings/proxy
        {
            "proxy": "no_proxy"  // 프록시 사용 안 함
        }
        또는
        {
            "proxy": "system"  // 시스템 프록시 사용
        }
        또는
        {
            "proxy": "http://proxy.example.com:8080"  // 지정된 프록시 사용
        }
    """
    proxy_data = await request.json()

    # 프록시 데이터 형식 검증
    if not isinstance(proxy_data, dict) or "proxy" not in proxy_data:
        raise HTTPException(
            status_code=400,
            detail="유효하지 않은 프록시 구성. 예상 형식: {'proxy': 'value'}")

    proxy_value = proxy_data["proxy"]

    # 프록시 값 형식 검증
    if not isinstance(proxy_value, str):
        raise HTTPException(
            status_code=400,
            detail="프록시 값은 문자열이어야 합니다")

    # 프록시 값 유효성 검증
    if proxy_value not in ['no_proxy', 'system'] and not proxy_value.startswith(('http://', 'https://', 'socks4://', 'socks5://')):
        raise HTTPException(
            status_code=400,
            detail="유효하지 않은 프록시 값. 'no_proxy', 'system', 또는 유효한 프록시 URL이어야 합니다")

    # 프록시 설정 업데이트
    result = await settings_service.update_settings({"proxy": proxy_value})
    return result


class CreateWorkflowRequest(BaseModel):
    name: str
    api_json: dict  # or str if you want it as string
    description: str
    inputs: list   # or str if you want it as string
    outputs: str = None


@router.post("/comfyui/create_workflow", summary="ComfyUI 워크플로우 생성")
async def create_workflow(request: CreateWorkflowRequest):
    """
    ComfyUI 워크플로우를 생성합니다.

    Args:
        request: 워크플로우 생성 요청 데이터

    Returns:
        dict: 생성 성공 여부
    """
    if not request.name:
        raise HTTPException(status_code=400, detail="이름이 필요합니다")
    if not request.api_json:
        raise HTTPException(status_code=400, detail="API JSON이 필요합니다")
    if not request.description:
        raise HTTPException(status_code=400, detail="설명이 필요합니다")
    if not request.inputs:
        raise HTTPException(status_code=400, detail="입력값이 필요합니다")
    try:
        name = request.name.replace(" ", "_")
        api_json = json.dumps(request.api_json)
        inputs = json.dumps(request.inputs)
        outputs = json.dumps(request.outputs)
        await db_service.create_comfy_workflow(name, api_json, request.description, inputs, outputs)
        await tool_service.initialize()
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"워크플로우 생성 실패: {str(e)}")


@router.get("/brand", summary="브랜드 정보 조회")
async def get_brand_info(authorization: str = Header(None)):
    """
    사용자의 브랜드 정보를 조회합니다.

    Returns:
        dict: 브랜드 정보
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        brand_info = await db_service.get_brand_info(user_id)
        if brand_info:
            return brand_info
        return {
            'name': '',
            'description': '',
            'industry': '',
            'targetAudience': '',
            'brandColors': '',
            'brandValues': '',
            'website': '',
            'socialMedia': '',
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )


@router.post("/brand", summary="브랜드 정보 저장")
async def save_brand_info(request: Request, authorization: str = Header(None)):
    """
    사용자의 브랜드 정보를 저장합니다.

    Args:
        request: 브랜드 정보 데이터

    Returns:
        dict: 저장 성공 여부
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        user_id = user["id"]
        
        brand_data = await request.json()
        await db_service.save_brand_info(user_id, brand_data)
        
        return {
            "status": "success",
            "message": "Brand information saved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )


@router.post("/brand/extract", summary="대화 내용에서 브랜드 정보 추출")
async def extract_brand_info(request: Request, authorization: str = Header(None)):
    """
    대화 내용에서 브랜드 정보를 추출합니다.

    Args:
        request: 대화 내용을 포함하는 요청

    Returns:
        dict: 추출된 브랜드 정보
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        
        data = await request.json()
        conversation = data.get('conversation', '')
        
        if not conversation:
            raise HTTPException(
                status_code=400,
                detail="Conversation is required"
            )
        
        # Use LLM to extract brand information
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage
        from services.config_service import config_service
        from utils.http_client import HttpClient
        
        # Get OpenAI config
        openai_config = config_service.app_config.get('openai', {})
        api_key = openai_config.get('api_key', '')
        base_url = openai_config.get('url', '')
        
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key is not configured"
            )
        
        # Create httpx client with SSL configuration for ChatOpenAI
        http_client = HttpClient.create_sync_client()
        http_async_client = HttpClient.create_async_client()
        
        # Create LLM instance
        llm = ChatOpenAI(
            model='gpt-4o-mini',
            api_key=api_key,
            base_url=base_url if base_url else None,
            temperature=0,
            http_client=http_client,
            http_async_client=http_async_client,
        )
        
        # System prompt for extraction
        system_prompt = """You are a brand information extraction assistant. Extract brand information from the conversation and return it as a JSON object with the following fields:
- name: Brand name
- description: Brand description
- industry: Industry or business sector
- targetAudience: Target audience description
- brandColors: Brand colors (hex codes, comma-separated)
- brandValues: Brand core values (comma-separated)
- website: Website URL
- socialMedia: Social media accounts (comma-separated)

Only include fields that are mentioned in the conversation. Return only valid JSON, no additional text."""

        # Extract information
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Extract brand information from this conversation:\n\n{conversation}")
        ]
        
        response = await llm.ainvoke(messages)
        response_text = response.content.strip()
        
        # Parse JSON response
        try:
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            extracted_info = json.loads(response_text)
            
            # Return only valid fields
            return {
                'name': extracted_info.get('name', ''),
                'description': extracted_info.get('description', ''),
                'industry': extracted_info.get('industry', ''),
                'targetAudience': extracted_info.get('targetAudience', ''),
                'brandColors': extracted_info.get('brandColors', ''),
                'brandValues': extracted_info.get('brandValues', ''),
                'website': extracted_info.get('website', ''),
                'socialMedia': extracted_info.get('socialMedia', ''),
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract information manually
            return {}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract brand info: {str(e)}"
        )


@router.post("/brand/chat", summary="브랜드 정보 수집을 위한 AI 챗봇")
async def brand_chat(request: Request, authorization: str = Header(None)):
    """
    브랜드 정보를 수집하기 위한 AI 챗봇 응답을 생성합니다.

    Args:
        request: 대화 메시지 목록을 포함하는 요청

    Returns:
        dict: AI 응답과 추출된 브랜드 정보
    """
    try:
        token = auth_service.extract_token_from_header(authorization)
        user = await auth_service.validate_token(token)
        
        data = await request.json()
        messages_list = data.get('messages', [])
        
        if not messages_list:
            raise HTTPException(
                status_code=400,
                detail="Messages are required"
            )
        
        # Use LLM for conversational response
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
        from services.config_service import config_service
        from utils.http_client import HttpClient
        
        # Get OpenAI config
        openai_config = config_service.app_config.get('openai', {})
        api_key = openai_config.get('api_key', '')
        base_url = openai_config.get('url', '')
        
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key is not configured"
            )
        
        # Create httpx client with SSL configuration for ChatOpenAI
        http_client = HttpClient.create_sync_client()
        http_async_client = HttpClient.create_async_client()
        
        # Create LLM instance
        llm = ChatOpenAI(
            model='gpt-4o-mini',
            api_key=api_key,
            base_url=base_url if base_url else None,
            temperature=0.7,
            http_client=http_client,
            http_async_client=http_async_client,
        )
        
        # System prompt for conversational brand information collection
        system_prompt = """You are a friendly and professional brand consultant assistant. Your goal is to help users provide information about their brand through natural conversation.

You should:
1. Ask questions about the brand in a conversational way
2. Collect information about: brand name, description, industry, target audience, brand colors, brand values, website, and social media
3. Be friendly, encouraging, and helpful
4. Ask follow-up questions when information is missing
5. Confirm information you've collected
6. Keep responses concise and natural

Start by greeting the user and asking about their brand name if it hasn't been mentioned yet."""

        # Convert messages to LangChain format
        langchain_messages = [SystemMessage(content=system_prompt)]
        for msg in messages_list:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role == 'user':
                langchain_messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                langchain_messages.append(AIMessage(content=content))
        
        # Get AI response
        response = await llm.ainvoke(langchain_messages)
        ai_response = response.content.strip()
        
        # Also extract brand information from the conversation
        conversation_text = '\n'.join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages_list])
        
        # Extract information using a separate call
        extraction_prompt = """Extract brand information from the conversation and return it as a JSON object with the following fields:
- name: Brand name
- description: Brand description
- industry: Industry or business sector
- targetAudience: Target audience description
- brandColors: Brand colors (hex codes, comma-separated)
- brandValues: Brand core values (comma-separated)
- website: Website URL
- socialMedia: Social media accounts (comma-separated)

Only include fields that are mentioned in the conversation. Return only valid JSON, no additional text."""
        
        extraction_messages = [
            SystemMessage(content=extraction_prompt),
            HumanMessage(content=f"Extract brand information from this conversation:\n\n{conversation_text}")
        ]
        
        extraction_response = await llm.ainvoke(extraction_messages)
        extraction_text = extraction_response.content.strip()
        
        extracted_info = {}
        try:
            # Remove markdown code blocks if present
            if extraction_text.startswith('```'):
                extraction_text = extraction_text.split('```')[1]
                if extraction_text.startswith('json'):
                    extraction_text = extraction_text[4:]
                extraction_text = extraction_text.strip()
            
            extracted_info = json.loads(extraction_text)
        except json.JSONDecodeError:
            pass
        
        # Return AI response and extracted info
        return {
            'response': ai_response,
            'extractedInfo': {
                'name': extracted_info.get('name', ''),
                'description': extracted_info.get('description', ''),
                'industry': extracted_info.get('industry', ''),
                'targetAudience': extracted_info.get('targetAudience', ''),
                'brandColors': extracted_info.get('brandColors', ''),
                'brandValues': extracted_info.get('brandValues', ''),
                'website': extracted_info.get('website', ''),
                'socialMedia': extracted_info.get('socialMedia', ''),
            }
        }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chat response: {str(e)}"
        )


@router.get("/comfyui/list_workflows", summary="ComfyUI 워크플로우 목록 조회")
async def list_workflows():
    """
    ComfyUI 워크플로우 목록을 조회합니다.

    Returns:
        List: 워크플로우 목록
    """
    return await db_service.list_comfy_workflows()


@router.delete("/comfyui/delete_workflow/{id}", summary="ComfyUI 워크플로우 삭제")
async def delete_workflow(id: int):
    """
    ComfyUI 워크플로우를 삭제합니다.

    Args:
        id: 워크플로우 ID

    Returns:
        dict: 삭제 결과
    """
    result = await db_service.delete_comfy_workflow(id)
    await tool_service.initialize()
    return result


@router.post("/comfyui/proxy", summary="ComfyUI 프록시 요청")
async def comfyui_proxy(request: Request):
    """
    ComfyUI API 요청을 프록시합니다.

    Args:
        request: ComfyUI URL과 경로를 포함하는 요청 데이터

    Returns:
        dict: ComfyUI 응답 데이터

    Description:
        프론트엔드에서 ComfyUI API를 직접 호출할 수 없을 때 서버를 통해 프록시합니다.
    """
    try:
        # 요청에서 ComfyUI의 대상 URL과 경로 가져오기
        data = await request.json()
        target_url = data.get("url")  # 프론트엔드에서 전달한 ComfyUI 주소 (예: http://127.0.0.1:8188)
        path = data.get("path", "")   # 요청 경로 (예: /system_stats)

        if not target_url or not path:
            raise HTTPException(
                status_code=400, detail="요청 본문에 'url' 또는 'path'가 없습니다")

        # 전체 ComfyUI 요청 URL 구성
        full_url = f"{target_url}{path}"

        # httpx를 사용하여 요청 전달 (GET/POST 등 지원, 여기서는 GET 예시)
        async with httpx.AsyncClient() as client:
            response = await client.get(full_url)
            # ComfyUI 응답을 그대로 프론트엔드에 반환
            return response.json()

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"프록시 요청 실패: {str(e)}")


@router.get("/knowledge/enabled", summary="활성화된 지식 베이스 목록 조회")
async def get_enabled_knowledge():
    """
    활성화된 지식 베이스 목록을 조회합니다.

    Returns:
        dict: 활성화된 지식 베이스 목록을 포함하는 응답
    """
    try:
        knowledge_list = list_user_enabled_knowledge()
        return {
            "success": True,
            "data": knowledge_list,
            "count": len(knowledge_list)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }


@router.get("/my_assets_dir_path", summary="My Assets 디렉토리 경로 조회")
async def get_my_assets_dir_path():
    """
    사용자의 My Assets 디렉토리 경로를 조회합니다.
    
    Returns:
        dict: 디렉토리 경로를 포함하는 응답
    """
    from services.config_service import FILES_DIR
    
    try:
        # 디렉토리가 존재하는지 확인
        os.makedirs(FILES_DIR, exist_ok=True)
        
        return {
            "success": True,
            "path": FILES_DIR,
            "message": "My Assets 디렉토리 경로를 성공적으로 조회했습니다"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "path": ""
        }
