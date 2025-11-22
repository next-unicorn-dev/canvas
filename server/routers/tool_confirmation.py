from fastapi import APIRouter, HTTPException
from services.websocket_service import send_to_websocket
from services.tool_confirmation_manager import tool_confirmation_manager
from models.dto import ToolConfirmationRequest, ToolConfirmationResponse

router = APIRouter(prefix="/api", tags=["Tool"])

@router.post("/tool_confirmation", response_model=ToolConfirmationResponse, summary="도구 실행 확인")
async def handle_tool_confirmation(request: ToolConfirmationRequest):
    """
    도구 실행 확인을 처리합니다.

    Args:
        request: 도구 확인 요청 데이터

    Returns:
        ToolConfirmationResponse: 처리 상태
    """
    try:
        if request.confirmed:
            # 도구 호출 확인
            success = tool_confirmation_manager.confirm_tool(
                request.tool_call_id)
            if success:
                await send_to_websocket(request.session_id, {
                    'type': 'tool_call_confirmed',
                    'id': request.tool_call_id
                })
            else:
                raise HTTPException(
                    status_code=404, detail="도구 호출을 찾을 수 없거나 이미 처리되었습니다")
        else:
            # 도구 호출 취소
            success = tool_confirmation_manager.cancel_confirmation(
                request.tool_call_id)
            if success:
                await send_to_websocket(request.session_id, {
                    'type': 'tool_call_cancelled',
                    'id': request.tool_call_id
                })
            else:
                raise HTTPException(
                    status_code=404, detail="도구 호출을 찾을 수 없거나 이미 처리되었습니다")

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
