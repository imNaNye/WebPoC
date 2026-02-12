"""
슬라이드 목록·메타정보·타일 이미지를 제공하는 REST API 라우터.

REST API: 자원(슬라이드, 타일)을 URL로 식별하고, GET으로 조회하는 방식.
클라이언트는 같은 URL을 다시 요청하면 캐시할 수 있고, 서버는 부가 상태 없이 응답만 반환한다.
"""
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

logger = logging.getLogger(__name__)

from app.tile_service import (
    get_wsi_dir,
    list_slide_ids,
    find_slide_path,
    get_slide_info,
    get_tile_bytes,
)

router = APIRouter(prefix="/api/slides", tags=["slides"])


@router.get("")
def api_list_slides():
    """
    GET /api/slides
    WSI_DIR 내 지원 확장자 파일 목록. 응답: [{ id, name }, ...]
    """
    try:
        wsi_dir = get_wsi_dir()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    items = list_slide_ids(wsi_dir)
    return {"items": items}


@router.get("/{slide_id}/info")
def api_slide_info(slide_id: str):
    """
    GET /api/slides/{slide_id}/info
    슬라이드 메타정보. OpenSlide level 0 기준 width, height, levelCount, tileSize.
    """
    try:
        wsi_dir = get_wsi_dir()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    path = find_slide_path(wsi_dir, slide_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"Slide not found: {slide_id}")
    try:
        info = get_slide_info(path)
        return info
    except Exception as e:
        logger.exception("get_slide_info failed for %s: %s", path, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{slide_id}/tiles/{level:int}/{tile}.{ext:path}")
def api_get_tile(slide_id: str, level: int, tile: str, ext: str):
    """
    GET /api/slides/{slide_id}/tiles/{level}/{x}_{y}.jpg
    tile 파라미터는 "x_y" 형태 (예: 0_0). 지정 레벨·타일 인덱스의 이미지 바이트 반환.
    """
    if ext.lower() not in ("jpg", "jpeg", "png"):
        raise HTTPException(status_code=400, detail="Only jpg or png allowed")
    parts = tile.split("_")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Tile must be x_y")
    try:
        x, y = int(parts[0]), int(parts[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="Tile indices must be integers")
    try:
        wsi_dir = get_wsi_dir()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    path = find_slide_path(wsi_dir, slide_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"Slide not found: {slide_id}")
    try:
        data = get_tile_bytes(path, level, x, y, ext)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    media_type = "image/jpeg" if ext.lower() in ("jpg", "jpeg") else "image/png"
    return Response(content=data, media_type=media_type)
