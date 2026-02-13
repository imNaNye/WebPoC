"""
WSI 파일을 OpenSlide로 열고, 요청된 타일을 생성하는 서비스.

도메인 지식:
- WSI(Whole Slide Image): 현미경 슬라이드를 스캔한 매우 큰 이미지(수만~수십만 픽셀).
  한 번에 메모리에 올리지 않고, "레벨(해상도)"과 "영역(region)" 단위로 읽는다.
- OpenSlide: WSI 파일(.ndpi, .svs, .tif 등)을 읽는 C 라이브러리.
  level 0 = 최고 해상도(원본), level 1 = 1/2, level 2 = 1/4 ... 로 피라미드가 있다.
- 타일: 클라이언트(OpenSeaDragon)가 요청하는 작은 조각(예: 256x256).
  read_region(level, (x,y), width, height)로 해당 영역 픽셀만 읽어 JPEG로 인코딩해 반환한다.

슬라이드당 OpenSlide 인스턴스 풀: 요청마다 열고 닫지 않고, 슬라이드(경로)당 최대 n개 인스턴스를
유지해 두고 요청 시 풀에서 꺼내 사용 후 반환한다.
"""
import os
import sys
import threading
from pathlib import Path
from typing import Optional

# Windows: OpenSlide C 라이브러리(DLL)가 PATH에 없으면 import가 실패한다.
# OPENSLIDE_BIN 환경 변수로 DLL 폴더를 지정하면 서버 시작 시 검색 경로에 추가한다.
if sys.platform == "win32":
    _dll_dir = os.environ.get("OPENSLIDE_BIN")
    if _dll_dir:
        _dll_path = Path(_dll_dir).resolve()
        if _dll_path.is_dir():
            os.add_dll_directory(str(_dll_path))

try:
    import openslide
except ImportError:
    openslide = None

from PIL import Image
import io

# 지원하는 WSI 확장자 (OpenSlide가 읽을 수 있는 형식)
SUPPORTED_EXTENSIONS = {".ndpi", ".svs", ".tif", ".tiff", ".vms", ".vmu", ".scn", ".bif", ".mrxs"}

TILE_SIZE = 256

# 슬라이드당 OpenSlide 인스턴스 풀 최대 개수 (동시 타일 요청 등에 대비)
MAX_OPENSLIDE_INSTANCES_PER_SLIDE = 4


class OpenSlidePool:
    """
    슬라이드(파일 경로)당 OpenSlide 인스턴스 풀.
    acquire(path)로 인스턴스를 얻고, 사용 후 release(path, instance)로 반환한다.
    """

    def __init__(self, max_per_slide: int = MAX_OPENSLIDE_INSTANCES_PER_SLIDE):
        self._max_per_slide = max_per_slide
        self._pool: dict[str, list] = {}  # path_str -> [OpenSlide, ...]
        self._in_use: dict[str, int] = {}  # path_str -> count
        self._lock = threading.Lock()

    def acquire(self, slide_path: Path):
        if openslide is None:
            raise RuntimeError("openslide-python is not installed or OpenSlide library is missing")
        path_str = str(slide_path.resolve())
        with self._lock:
            if path_str not in self._pool:
                self._pool[path_str] = []
                self._in_use[path_str] = 0
            available = self._pool[path_str]
            total = len(available) + self._in_use[path_str]
            if available:
                slide = available.pop()
                self._in_use[path_str] += 1
                return slide
            if total >= self._max_per_slide:
                # 풀 한도 초과 시 None 반환 → 호출측에서 임시로 열었다 닫기
                return None
            self._in_use[path_str] += 1
        try:
            slide = openslide.OpenSlide(path_str)
        except Exception as e:
            with self._lock:
                self._in_use[path_str] -= 1
            raise RuntimeError(f"OpenSlide could not open {slide_path}: {e}") from e
        return slide

    def release(self, slide_path: Path, slide) -> None:
        path_str = str(slide_path.resolve())
        with self._lock:
            self._in_use[path_str] -= 1
            self._pool[path_str].append(slide)


_slide_pool: Optional[OpenSlidePool] = None
_pool_lock = threading.Lock()


def _get_pool() -> OpenSlidePool:
    global _slide_pool
    with _pool_lock:
        if _slide_pool is None:
            _slide_pool = OpenSlidePool()
        return _slide_pool


def get_wsi_dir() -> Path:
    """환경 변수 WSI_DIR을 읽어 WSI 파일이 있는 디렉터리 경로를 반환."""
    path = os.environ.get("WSI_DIR")
    if not path:
        raise ValueError("WSI_DIR environment variable is not set")
    p = Path(path).resolve()
    if not p.is_dir():
        raise ValueError(f"WSI_DIR is not a directory: {p}")
    return p


def list_slide_ids(wsi_dir: Path) -> list[dict]:
    """
    WSI_DIR 내 지원 확장자 파일 목록을 반환.
    id = 확장자 제거한 파일명 (URL-safe 식별자)
    name = 원본 파일명
    """
    result = []
    seen = set()
    for ext in SUPPORTED_EXTENSIONS:
        for f in wsi_dir.glob(f"*{ext}"):
            if not f.is_file():
                continue
            slide_id = f.stem  # 확장자 제거
            if slide_id in seen:
                continue
            seen.add(slide_id)
            result.append({"id": slide_id, "name": f.name})
    return sorted(result, key=lambda x: x["id"])


def find_slide_path(wsi_dir: Path, slide_id: str) -> Optional[Path]:
    """slide_id에 해당하는 실제 파일 경로를 찾는다. 지원 확장자 순으로 시도."""
    for ext in SUPPORTED_EXTENSIONS:
        path = wsi_dir / f"{slide_id}{ext}"
        if path.is_file():
            return path
    return None


def _with_slide(slide_path: Path, use_slide):
    """
    풀에서 OpenSlide 인스턴스를 얻어 use_slide(slide)를 실행한다.
    풀에 여유가 없으면 해당 요청만 임시로 열었다 닫는다.
    """
    pool = _get_pool()
    slide = pool.acquire(slide_path)
    if slide is not None:
        try:
            return use_slide(slide)
        finally:
            pool.release(slide_path, slide)
    path_str = str(slide_path.resolve())
    try:
        slide = openslide.OpenSlide(path_str)
    except Exception as e:
        raise RuntimeError(f"OpenSlide could not open {slide_path}: {e}") from e
    try:
        return use_slide(slide)
    finally:
        slide.close()


def get_slide_info(slide_path: Path) -> dict:
    """
    OpenSlide로 슬라이드를 열어 level 0 기준 크기, 레벨 수, 타일 크기를 반환.
    level_dimensions[i] = (width, height) at level i. level 0이 원본 해상도.
    풀에서 인스턴스를 꺼내 사용 후 반환한다.
    """
    if openslide is None:
        raise RuntimeError("openslide-python is not installed or OpenSlide library is missing")

    def use(slide):
        if slide.level_count < 1:
            raise RuntimeError(f"Slide has no levels: {slide_path}")
        w, h = slide.level_dimensions[0]
        level_count = slide.level_count
        level_dimensions = [list(slide.level_dimensions[i]) for i in range(level_count)]
        level_downsamples = list(slide.level_downsamples)
        return {
            "width": w,
            "height": h,
            "levelCount": level_count,
            "tileSize": TILE_SIZE,
            "levelDimensions": level_dimensions,
            "levelDownsamples": level_downsamples,
        }

    return _with_slide(slide_path, use)


def get_tile_bytes(slide_path: Path, level: int, x: int, y: int, ext: str = "jpg") -> bytes:
    """
    지정 level에서 (x, y) 타일 인덱스에 해당하는 영역을 읽어 이미지 바이트로 반환.
    OpenSlide read_region(location, level, size)의 location은 항상 level 0 픽셀 좌표이므로,
    해당 레벨의 타일 (x,y) 위치를 level 0 좌표로 변환해야 한다.
    풀에서 인스턴스를 꺼내 사용 후 반환한다.
    """
    if openslide is None:
        raise RuntimeError("openslide-python is not installed or OpenSlide library is missing")

    def use(slide):
        w0, h0 = slide.level_dimensions[0]
        wL, hL = slide.level_dimensions[level]
        px_at_L = x * TILE_SIZE
        py_at_L = y * TILE_SIZE
        scale_x = w0 / wL
        scale_y = h0 / hL
        px = int(px_at_L * scale_x)
        py = int(py_at_L * scale_y)
        read_w = min(TILE_SIZE, wL - px_at_L)
        read_h = min(TILE_SIZE, hL - py_at_L)
        if read_w <= 0 or read_h <= 0:
            img = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (255, 255, 255))
        else:
            region = slide.read_region((px, py), level, (read_w, read_h))
            if region.mode == "RGBA":
                img = Image.new("RGB", region.size, (255, 255, 255))
                img.paste(region, mask=region.split()[3])
            else:
                img = region.convert("RGB")
            if read_w < TILE_SIZE or read_h < TILE_SIZE:
                out = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (255, 255, 255))
                out.paste(img, (0, 0))
                img = out
        buf = io.BytesIO()
        if ext.lower() == "png":
            img.save(buf, format="PNG")
        else:
            img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    return _with_slide(slide_path, use)
