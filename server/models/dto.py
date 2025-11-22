"""
DTO (Data Transfer Object) 모델 - API 요청 및 응답을 위한 데이터 전송 객체
이 모델들은 Swagger/OpenAPI 문서화에 사용됩니다.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


# ============= Chat DTOs =============
class ChatMessage(BaseModel):
    """채팅 메시지 모델"""
    role: str = Field(..., description="메시지 역할 (user, assistant, system)")
    content: Any = Field(..., description="메시지 내용 (문자열 또는 복합 구조)")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="도구 호출 정보")
    tool_call_id: Optional[str] = Field(None, description="도구 호출 ID")
    
    class Config:
        # Allow any content type (string, list, dict, etc.)
        arbitrary_types_allowed = True


class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    messages: List[ChatMessage] = Field(..., description="메시지 목록")
    canvas_id: str = Field(..., description="캔버스 ID")
    session_id: str = Field(..., description="세션 ID")
    text_model: Dict[str, Any] = Field(..., description="텍스트 모델 설정")
    tool_list: List[Dict[str, Any]] = Field(default_factory=list, description="도구 목록")
    system_prompt: Optional[str] = Field(None, description="시스템 프롬프트")


class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    status: str = Field(..., description="상태 (done)")


class CancelResponse(BaseModel):
    """취소 응답 모델"""
    status: str = Field(..., description="상태 (cancelled | not_found_or_done)")


# ============= Canvas DTOs =============
class CanvasInfo(BaseModel):
    """캔버스 정보 모델"""
    id: str = Field(..., description="캔버스 ID")
    name: str = Field(..., description="캔버스 이름")
    description: Optional[str] = Field(None, description="캔버스 설명")
    thumbnail: Optional[str] = Field(None, description="캔버스 썸네일")
    created_at: str = Field(..., description="생성 일시")


class CreateCanvasRequest(BaseModel):
    """캔버스 생성 요청 모델"""
    name: str = Field(..., description="캔버스 이름")
    canvas_id: str = Field(..., description="캔버스 ID")
    messages: List[Dict[str, Any]] = Field(..., description="메시지 목록")
    session_id: str = Field(..., description="세션 ID")
    text_model: Dict[str, Any] = Field(..., description="텍스트 모델 설정")
    tool_list: List[Dict[str, Any]] = Field(..., description="도구 목록")
    system_prompt: str = Field(..., description="시스템 프롬프트")


class CreateCanvasResponse(BaseModel):
    """캔버스 생성 응답 모델"""
    id: str = Field(..., description="생성된 캔버스 ID")


class GetCanvasResponse(BaseModel):
    """캔버스 조회 응답 모델"""
    data: Dict[str, Any] = Field(..., description="캔버스 데이터")
    name: str = Field(..., description="캔버스 이름")
    sessions: List[Dict[str, Any]] = Field(..., description="세션 목록")


class SaveCanvasRequest(BaseModel):
    """캔버스 저장 요청 모델"""
    data: Dict[str, Any] = Field(..., description="캔버스 데이터")
    thumbnail: str = Field(..., description="캔버스 썸네일")


class RenameCanvasRequest(BaseModel):
    """캔버스 이름 변경 요청 모델"""
    name: str = Field(..., description="새 캔버스 이름")


class CanvasIdResponse(BaseModel):
    """캔버스 ID 응답 모델"""
    id: str = Field(..., description="캔버스 ID")


# ============= Workspace DTOs =============
class UpdateFileRequest(BaseModel):
    """파일 업데이트 요청 모델"""
    path: str = Field(..., description="파일 경로")
    content: str = Field(..., description="파일 내용")


class UpdateFileResponse(BaseModel):
    """파일 업데이트 응답 모델"""
    success: Optional[bool] = Field(None, description="성공 여부")
    error: Optional[str] = Field(None, description="에러 메시지")
    path: Optional[str] = Field(None, description="파일 경로")


class CreateFileRequest(BaseModel):
    """파일 생성 요청 모델"""
    rel_dir: str = Field(..., description="상대 디렉토리 경로")


class CreateFileResponse(BaseModel):
    """파일 생성 응답 모델"""
    path: str = Field(..., description="생성된 파일 경로")


class DeleteFileRequest(BaseModel):
    """파일 삭제 요청 모델"""
    path: str = Field(..., description="삭제할 파일 경로")


class DeleteFileResponse(BaseModel):
    """파일 삭제 응답 모델"""
    success: bool = Field(..., description="성공 여부")


class RenameFileRequest(BaseModel):
    """파일 이름 변경 요청 모델"""
    old_path: str = Field(..., description="기존 파일 경로")
    new_title: str = Field(..., description="새 파일 이름")


class RenameFileResponse(BaseModel):
    """파일 이름 변경 응답 모델"""
    success: bool = Field(..., description="성공 여부")
    path: str = Field(..., description="변경된 파일 경로")
    error: Optional[str] = Field(None, description="에러 메시지")


class ReadFileRequest(BaseModel):
    """파일 읽기 요청 모델"""
    path: str = Field(..., description="읽을 파일 경로")


class ReadFileResponse(BaseModel):
    """파일 읽기 응답 모델"""
    content: Optional[str] = Field(None, description="파일 내용")
    error: Optional[str] = Field(None, description="에러 메시지")
    path: Optional[str] = Field(None, description="파일 경로")


class FileNode(BaseModel):
    """파일 노드 모델"""
    name: str = Field(..., description="파일/디렉토리 이름")
    is_dir: bool = Field(..., description="디렉토리 여부")
    rel_path: str = Field(..., description="상대 경로")


class ListFilesResponse(BaseModel):
    """파일 목록 조회 응답 모델"""
    files: List[FileNode] = Field(..., description="파일 노드 목록")


class BrowseFilesystemResponse(BaseModel):
    """파일 시스템 브라우징 응답 모델"""
    current_path: str = Field(..., description="현재 경로")
    parent_path: Optional[str] = Field(None, description="부모 경로")
    items: List[Dict[str, Any]] = Field(..., description="파일/디렉토리 목록")


class MediaFileInfo(BaseModel):
    """미디어 파일 정보 모델"""
    name: str = Field(..., description="파일 이름")
    path: str = Field(..., description="파일 경로")
    type: str = Field(..., description="파일 타입")
    size: int = Field(..., description="파일 크기")
    mtime: float = Field(..., description="수정 시간")


class GetMediaFilesResponse(BaseModel):
    """미디어 파일 목록 응답 모델"""
    files: List[MediaFileInfo] = Field(..., description="미디어 파일 목록")


# ============= Settings DTOs =============
class SettingsExistsResponse(BaseModel):
    """설정 파일 존재 여부 응답 모델"""
    exists: bool = Field(..., description="설정 파일 존재 여부")


class GetSettingsResponse(BaseModel):
    """설정 조회 응답 모델"""
    settings: Dict[str, Any] = Field(..., description="설정 정보")


class UpdateSettingsRequest(BaseModel):
    """설정 업데이트 요청 모델"""
    settings: Dict[str, Any] = Field(..., description="설정 정보")


class UpdateSettingsResponse(BaseModel):
    """설정 업데이트 응답 모델"""
    status: str = Field(..., description="상태 (success | error)")
    message: str = Field(..., description="메시지")


# ============= Config DTOs =============
class ConfigExistsResponse(BaseModel):
    """구성 파일 존재 여부 응답 모델"""
    exists: bool = Field(..., description="구성 파일 존재 여부")


class GetConfigResponse(BaseModel):
    """구성 조회 응답 모델"""
    config: Dict[str, Any] = Field(..., description="구성 정보")


class UpdateConfigRequest(BaseModel):
    """구성 업데이트 요청 모델"""
    config: Dict[str, Any] = Field(..., description="구성 정보")


class UpdateConfigResponse(BaseModel):
    """구성 업데이트 응답 모델"""
    status: str = Field(..., description="상태 (success | error)")
    message: str = Field(..., description="메시지")


# ============= Tool DTOs =============
class ToolConfirmationRequest(BaseModel):
    """도구 확인 요청 모델"""
    session_id: str = Field(..., description="세션 ID")
    tool_call_id: str = Field(..., description="도구 호출 ID")
    confirmed: bool = Field(..., description="확인 여부")


class ToolConfirmationResponse(BaseModel):
    """도구 확인 응답 모델"""
    status: str = Field(..., description="상태")


# ============= Image DTOs =============
class UploadImageResponse(BaseModel):
    """이미지 업로드 응답 모델"""
    file_id: str = Field(..., description="파일 ID")
    width: int = Field(..., description="이미지 너비")
    height: int = Field(..., description="이미지 높이")
    url: str = Field(..., description="파일 URL")


# ============= Model DTOs =============
class ModelInfoResponse(BaseModel):
    """모델 정보 응답 모델"""
    provider: str = Field(..., description="프로바이더")
    model: str = Field(..., description="모델 이름")
    url: str = Field(..., description="API URL")
    type: Literal['text', 'image', 'tool', 'video'] = Field(..., description="모델 타입")


class ToolInfoResponse(BaseModel):
    """도구 정보 응답 모델"""
    id: str = Field(..., description="도구 ID")
    provider: str = Field(..., description="프로바이더")
    type: str = Field(..., description="도구 타입")
    display_name: Optional[str] = Field(None, description="표시 이름")


class ListModelsResponse(BaseModel):
    """모델 목록 응답 모델"""
    models: List[ModelInfoResponse] = Field(..., description="모델 목록")


class ListToolsResponse(BaseModel):
    """도구 목록 응답 모델"""
    tools: List[ToolInfoResponse] = Field(..., description="도구 목록")

