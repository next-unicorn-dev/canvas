from fastapi import APIRouter, Request
#from routers.agent import chat
from services.chat_service import handle_chat
from services.db_service import db_service
import asyncio
import json
from models.dto import (
    CanvasInfo, CreateCanvasRequest, CreateCanvasResponse,
    GetCanvasResponse, SaveCanvasRequest, RenameCanvasRequest, CanvasIdResponse
)
from typing import List

router = APIRouter(prefix="/api/canvas", tags=["Canvas"])

@router.get("/list", response_model=List[CanvasInfo], summary="캔버스 목록 조회")
async def list_canvases():
    """
    모든 캔버스 목록을 조회합니다.

    Returns:
        List[CanvasInfo]: 캔버스 정보 목록
    """
    return await db_service.list_canvases()

@router.post("/create", response_model=CreateCanvasResponse, summary="캔버스 생성")
async def create_canvas(request: CreateCanvasRequest):
    """
    새로운 캔버스를 생성합니다.

    Args:
        request: 캔버스 생성 요청 데이터

    Returns:
        CreateCanvasResponse: 생성된 캔버스 ID
    """
    data = request.dict()
    id = data.get('canvas_id')
    name = data.get('name')
    messages = data.get('messages', [])

    # Only handle chat if there are messages (for empty canvas, skip chat handling)
    if messages and len(messages) > 0:
        asyncio.create_task(handle_chat(data))
    else:
        # For empty canvas, create a session but don't process messages
        session_id = data.get('session_id')
        if session_id:
            text_model = data.get('text_model', {})
            await db_service.create_chat_session(
                session_id,
                text_model.get('model', ''),
                text_model.get('provider', ''),
                id,
                ''
            )

    await db_service.create_canvas(id, name)
    return CreateCanvasResponse(id=id)

@router.get("/{id}", response_model=GetCanvasResponse, summary="캔버스 조회")
async def get_canvas(id: str):
    """
    특정 캔버스의 정보를 조회합니다.

    Args:
        id: 캔버스 ID

    Returns:
        GetCanvasResponse: 캔버스 데이터, 이름, 세션 목록
    """
    result = await db_service.get_canvas_data(id)
    return result

@router.post("/{id}/save", response_model=CanvasIdResponse, summary="캔버스 저장")
async def save_canvas(id: str, request: SaveCanvasRequest):
    """
    캔버스 데이터를 저장합니다.

    Args:
        id: 캔버스 ID
        request: 저장할 캔버스 데이터

    Returns:
        CanvasIdResponse: 저장된 캔버스 ID
    """
    data_str = json.dumps(request.data)
    await db_service.save_canvas_data(id, data_str, request.thumbnail)
    return CanvasIdResponse(id=id)

@router.post("/{id}/rename", response_model=CanvasIdResponse, summary="캔버스 이름 변경")
async def rename_canvas(id: str, request: RenameCanvasRequest):
    """
    캔버스 이름을 변경합니다.

    Args:
        id: 캔버스 ID
        request: 새로운 캔버스 이름

    Returns:
        CanvasIdResponse: 변경된 캔버스 ID
    """
    await db_service.rename_canvas(id, request.name)
    return CanvasIdResponse(id=id)

@router.delete("/{id}/delete", response_model=CanvasIdResponse, summary="캔버스 삭제")
async def delete_canvas(id: str):
    """
    캔버스를 삭제합니다.

    Args:
        id: 캔버스 ID

    Returns:
        CanvasIdResponse: 삭제된 캔버스 ID
    """
    await db_service.delete_canvas(id)
    return CanvasIdResponse(id=id)