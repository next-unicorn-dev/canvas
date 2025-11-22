#server/routers/chat_router.py
from fastapi import APIRouter, Request
from services.chat_service import handle_chat
from services.magic_service import handle_magic
from services.stream_service import get_stream_task
from typing import Dict
from models.dto import ChatRequest, ChatResponse, CancelResponse

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatResponse, summary="채팅 메시지 전송")
async def chat(request: ChatRequest):
    """
    채팅 메시지를 전송하고 처리합니다.

    Args:
        request: 채팅 요청 데이터 (메시지, 캔버스 ID, 세션 ID, 모델 설정 등)

    Returns:
        ChatResponse: 처리 완료 상태
    """
    data = request.dict()
    await handle_chat(data)
    return ChatResponse(status="done")

@router.post("/cancel/{session_id}", response_model=CancelResponse, summary="채팅 취소")
async def cancel_chat(session_id: str):
    """
    진행 중인 채팅 작업을 취소합니다.

    Args:
        session_id: 취소할 세션 ID

    Returns:
        CancelResponse: 취소 상태 (cancelled | not_found_or_done)
    """
    task = get_stream_task(session_id)
    if task and not task.done():
        task.cancel()
        return CancelResponse(status="cancelled")
    return CancelResponse(status="not_found_or_done")

@router.post("/magic", response_model=ChatResponse, summary="매직 생성 요청")
async def magic(request: Request):
    """
    매직 생성 요청을 처리합니다.

    Args:
        request: 매직 생성 요청 데이터

    Returns:
        ChatResponse: 처리 완료 상태
    """
    data = await request.json()
    await handle_magic(data)
    return ChatResponse(status="done")

@router.post("/magic/cancel/{session_id}", response_model=CancelResponse, summary="매직 생성 취소")
async def cancel_magic(session_id: str):
    """
    진행 중인 매직 생성 작업을 취소합니다.

    Args:
        session_id: 취소할 세션 ID

    Returns:
        CancelResponse: 취소 상태 (cancelled | not_found_or_done)
    """
    task = get_stream_task(session_id)
    if task and not task.done():
        task.cancel()
        return CancelResponse(status="cancelled")
    return CancelResponse(status="not_found_or_done")
