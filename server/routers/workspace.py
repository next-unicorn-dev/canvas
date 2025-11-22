import os
import traceback
import platform
import subprocess
import mimetypes
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse
from services.config_service import USER_DATA_DIR

router = APIRouter(prefix="/api", tags=["Workspace"])

WORKSPACE_ROOT = os.path.join(USER_DATA_DIR, "workspace")

@router.post("/update_file", summary="파일 업데이트")
async def update_file(request: Request):
    """
    파일 내용을 업데이트합니다.

    Args:
        request: 파일 경로와 내용을 포함하는 요청 데이터

    Returns:
        dict: 성공 여부 또는 에러 정보
    """
    path = "unknown"
    try:
        data = await request.json()
        path = data.get("path", "unknown")
        full_path = os.path.join(WORKSPACE_ROOT, path)
        content = data["content"]
        with open(full_path, "w") as f:
            f.write(content)
        return {"success": True}
    except Exception as e:
        return {"error": str(e), "path": path}

@router.post("/create_file", summary="파일 생성")
async def create_file(request: Request):
    """
    새 파일을 생성합니다.

    Args:
        request: 상대 디렉토리 경로를 포함하는 요청 데이터

    Returns:
        dict: 생성된 파일 경로
    """
    data = await request.json()
    rel_dir = data["rel_dir"]
    path = os.path.join(WORKSPACE_ROOT, rel_dir, 'Untitled.md')
    # Split the path into directory, filename, and extension
    dir_name, base_name = os.path.split(path)
    name, ext = os.path.splitext(base_name)

    candidate_path = path
    counter = 1
    while os.path.exists(candidate_path):
        # Generate new filename with incremented counter
        new_base = f"{name} {counter}{ext}"
        candidate_path = os.path.join(dir_name, new_base)
        counter += 1
    print('candidate_path', candidate_path)
    os.makedirs(os.path.dirname(candidate_path), exist_ok=True)
    with open(candidate_path, "w") as f:
        f.write("")
    return {"path": os.path.relpath(candidate_path, WORKSPACE_ROOT)}

@router.post("/delete_file", summary="파일 삭제")
async def delete_file(request: Request):
    """
    파일을 삭제합니다.

    Args:
        request: 삭제할 파일 경로를 포함하는 요청 데이터

    Returns:
        dict: 성공 여부
    """
    data = await request.json()
    path = data["path"]
    os.remove(path)
    return {"success": True}

@router.post("/rename_file", summary="파일 이름 변경")
async def rename_file(request: Request):
    """
    파일 이름을 변경합니다.

    Args:
        request: 기존 파일 경로와 새 파일 이름을 포함하는 요청 데이터

    Returns:
        dict: 성공 여부 및 파일 경로
    """
    try:
        data = await request.json()
        old_path = data["old_path"]
        old_path = os.path.join(WORKSPACE_ROOT, old_path)
        new_title = data["new_title"]
        if os.path.exists(old_path):
            new_path = os.path.join(os.path.dirname(old_path), new_title)
            os.rename(old_path, new_path)
            return {"success": True, "path": new_path}
        else:
            return {"error": f"파일 {old_path}이(가) 존재하지 않습니다", "path": old_path}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/read_file", summary="파일 읽기")
async def read_file(request: Request):
    """
    파일 내용을 읽습니다.

    Args:
        request: 읽을 파일 경로를 포함하는 요청 데이터

    Returns:
        dict: 파일 내용 또는 에러 정보
    """
    path = "unknown"
    try:
        data = await request.json()
        path = data.get("path", "unknown")
        full_path = os.path.join(WORKSPACE_ROOT, path)
        if os.path.exists(full_path):
            with open(full_path, "r") as f:
                content = f.read()
                return {"content": content}
        else:
            return {"error": f"파일 {path}이(가) 존재하지 않습니다", "path": path}
    except Exception as e:
        return {"error": str(e), "path": path}

@router.get("/list_files_in_dir", summary="디렉토리 내 파일 목록 조회")
async def list_files_in_dir(rel_path: str) -> list[dict[str, str | bool]]:
    """
    지정된 디렉토리 내의 파일 목록을 조회합니다.

    Args:
        rel_path: 상대 경로

    Returns:
        List[dict]: 파일 노드 목록 (이름, 디렉토리 여부, 상대 경로)
    """
    try:
        full_path = os.path.join(WORKSPACE_ROOT, rel_path)
        files = os.listdir(full_path)
        file_nodes: list[dict[str, str | bool | float]] = []
        for file in files:
            file_path = os.path.join(full_path, file)
            file_nodes.append({
                "name": file,
                "is_dir": os.path.isdir(file_path),
                "rel_path": os.path.join(rel_path, file),
                "mtime": os.path.getmtime(file_path)  # Get modification time
            })
        # Sort by modification time in descending order
        file_nodes.sort(key=lambda x: float(x["mtime"]), reverse=True)
        # Remove mtime from response as it was only used for sorting
        for node in file_nodes:
            node.pop("mtime")
        return [{"name": str(node["name"]), "is_dir": bool(node["is_dir"]), "rel_path": str(node["rel_path"])} for node in file_nodes]
    except Exception:
        return []

@router.post("/open_folder_in_explorer", summary="폴더를 파일 탐색기에서 열기")
async def open_folder_in_explorer(request: Request):
    """
    시스템 파일 탐색기에서 지정된 폴더를 엽니다.
    
    Args:
        request: 폴더 경로를 포함하는 요청
    
    Returns:
        dict: 작업 결과
    """
    try:
        data = await request.json()
        folder_path = data.get("path")
        
        if not folder_path:
            raise HTTPException(status_code=400, detail="폴더 경로가 누락되었습니다")
        
        # 경로가 존재하고 폴더인지 확인
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다")
        
        if not os.path.isdir(folder_path):
            raise HTTPException(status_code=400, detail="경로가 디렉토리가 아닙니다")
        
        # 운영 체제에 따라 파일 탐색기 열기
        system = platform.system()
        
        if system == "Windows":
            # Windows
            subprocess.run(["explorer", folder_path], check=True)
        elif system == "Darwin":
            # macOS
            subprocess.run(["open", folder_path], check=True)
        elif system == "Linux":
            # Linux
            subprocess.run(["xdg-open", folder_path], check=True)
        else:
            raise HTTPException(status_code=500, detail=f"지원하지 않는 운영 체제: {system}")
        
        return {"success": True, "message": "시스템 탐색기에서 폴더가 열렸습니다"}
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"폴더 열기 실패: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"폴더 열기 오류: {str(e)}")

@router.get("/browse_filesystem", summary="파일 시스템 브라우징")
async def browse_filesystem(path: str = "") -> dict[str, str | None | list[dict[str, str | int | float | bool | None]]]:
    """
    컴퓨터의 임의 위치의 파일 시스템을 브라우징합니다.
    
    Args:
        path: 브라우징할 경로, 비어있으면 사용자 홈 디렉토리에서 시작
    
    Returns:
        dict: 폴더와 파일 정보를 포함하는 목록
    """
    try:
        # path가 비어있으면 사용자 홈 디렉토리에서 시작
        if not path:
            path = os.path.expanduser("~")
        
        # 경로가 존재하고 접근 가능한지 확인
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="경로를 찾을 수 없습니다")
        
        if not os.path.isdir(path):
            raise HTTPException(status_code=400, detail="경로가 디렉토리가 아닙니다")
        
        items: list[dict[str, str | int | float | bool | None]] = []
        
        try:
                    # 디렉토리 내의 모든 항목 가져오기
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    
                    # 숨김 파일 건너뛰기 (선택 사항)
                    if item.startswith('.'):
                        continue
                    
                    try:
                        stat = os.stat(item_path)
                        is_dir = os.path.isdir(item_path)
                        
                        # 파일 타입 가져오기
                        file_type = "folder" if is_dir else get_file_type(item_path)
                        
                        # 파일 크기 가져오기 (파일만)
                        size: int | None = stat.st_size if not is_dir else None
                        
                        # 수정 시간 가져오기
                        mtime = stat.st_mtime
                        
                        # 이미지 또는 비디오 파일인지 확인
                        is_media = file_type in ["image", "video"]
                        
                        item_info: dict[str, str | int | float | bool | None] = {
                            "name": item,
                            "path": item_path,
                            "type": file_type,
                            "size": size,
                            "mtime": mtime,
                            "is_directory": is_dir,
                            "is_media": is_media,
                            "has_thumbnail": is_media  # 썸네일 생성 가능
                        }
                        
                        items.append(item_info)
                        
                    except (OSError, PermissionError):
                        # 접근 불가능한 파일 건너뛰기
                        continue
                    
        except PermissionError:
            raise HTTPException(status_code=403, detail="권한이 거부되었습니다")
        
        # 타입과 이름으로 정렬: 폴더가 먼저, 그 다음 이름 순
        items.sort(key=lambda x: (not bool(x["is_directory"]), str(x["name"]).lower()))
        
        return {
            "current_path": path,
            "parent_path": os.path.dirname(path) if path != os.path.dirname(path) else None,
            "items": items
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_media_files", summary="미디어 파일 목록 조회")
async def get_media_files(path: str) -> list[dict[str, str | int | float]]:
    """
    지정된 폴더 내의 모든 미디어 파일(이미지 및 비디오)을 조회합니다.
    
    Args:
        path: 폴더 경로
    
    Returns:
        미디어 파일 목록
    """
    try:
        if not os.path.exists(path) or not os.path.isdir(path):
            raise HTTPException(status_code=400, detail="유효하지 않은 디렉토리 경로입니다")
        
        media_files: list[dict[str, str | int | float]] = []
        
        try:
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                
                if os.path.isfile(item_path):
                    file_type = get_file_type(item_path)
                    
                    if file_type in ["image", "video"]:
                        stat = os.stat(item_path)
                        
                        media_files.append({
                            "name": item,
                            "path": item_path,
                            "type": file_type,
                            "size": stat.st_size,
                            "mtime": stat.st_mtime
                        })
                        
        except PermissionError:
            raise HTTPException(status_code=403, detail="권한이 거부되었습니다")
        
        # 수정 시간으로 정렬
        media_files.sort(key=lambda x: float(x["mtime"]), reverse=True)
        
        return media_files
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_file_thumbnail", summary="파일 썸네일 정보 조회")
async def get_file_thumbnail(file_path: str):
    """
    파일의 썸네일 정보를 조회합니다.

    Args:
        file_path (str): 파일 경로

    Returns:
        dict: 썸네일 정보 또는 파일 정보를 포함하는 딕셔너리
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        
        file_type = get_file_type(file_path)
        
        return {
            "path": file_path,
            "type": file_type,
            "exists": True,
            "can_preview": file_type in ["image", "video"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_file_type(file_path: str) -> str:
    """
    파일 확장자에 따라 파일 타입을 판단합니다.
    
    Args:
        file_path: 파일 경로
    
    Returns:
        파일 타입: 'image', 'video', 'audio', 'document', 'archive', 'code', 'file'
    """
    if os.path.isdir(file_path):
        return "folder"
    
    _, ext = os.path.splitext(file_path.lower())
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg', '.ico'}
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp'}
    audio_extensions = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'}
    document_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages'}
    archive_extensions = {'.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'}
    code_extensions = {'.py', '.js', '.html', '.css', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs'}
    
    if ext in image_extensions:
        return "image"
    elif ext in video_extensions:
        return "video"
    elif ext in audio_extensions:
        return "audio"
    elif ext in document_extensions:
        return "document"
    elif ext in archive_extensions:
        return "archive"
    elif ext in code_extensions:
        return "code"
    else:
        return "file"

@router.get("/serve_file", summary="파일 서빙")
async def serve_file(file_path: str):
    """
    파일 내용을 서빙하여 브라우저에서 이미지와 비디오를 미리볼 수 있게 합니다.
    
    Args:
        file_path: 파일 경로
    
    Returns:
        파일 내용
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=400, detail="경로가 파일이 아닙니다")
        
        # 파일 타입 확인
        file_type = get_file_type(file_path)
        if file_type not in ["image", "video"]:
            raise HTTPException(status_code=400, detail="미리보기를 지원하지 않는 파일 타입입니다")
        
        # MIME 타입 가져오기
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"
        
        return FileResponse(
            file_path,
            media_type=mime_type,
            filename=os.path.basename(file_path)
        )
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_file_info", summary="파일 상세 정보 조회")
async def get_file_info(file_path: str):
    """
    파일의 상세 정보를 조회합니다.
    
    Args:
        file_path: 파일 경로
    
    Returns:
        파일 상세 정보
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        
        stat = os.stat(file_path)
        file_type = get_file_type(file_path)
        
        return {
            "name": os.path.basename(file_path),
            "path": file_path,
            "type": file_type,
            "size": stat.st_size,
            "mtime": stat.st_mtime,
            "ctime": getattr(stat, "st_birthtime", None) or getattr(stat, "st_ctime", None),
            "is_directory": os.path.isdir(file_path),
            "is_media": file_type in ["image", "video"],
            "mime_type": mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))