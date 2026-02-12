# WSI 타일 서버

원본 WSI 파일을 OpenSlide로 읽어, OpenSeaDragon이 요청하는 타일 이미지를 on-demand로 생성해 반환하는 FastAPI 서버.

## 요구 사항

- Python 3.10+
- **OpenSlide C 라이브러리** (시스템 설치 필요)
  - Windows: [OpenSlide Windows 빌드](https://github.com/openslide/openslide-bin/releases)에서 ZIP 받아 풀고, **bin** 폴더 경로를 아래 중 하나로 설정:
    - 시스템 PATH에 추가하거나
    - 서버 실행 전 `OPENSLIDE_BIN` 환경 변수로 지정 (예: `$env:OPENSLIDE_BIN = "C:\openslide-win64\bin"`). PATH에 넣어도 로드되지 않을 때 이 방법 사용.
  - macOS: `brew install openslide`
  - Linux: `sudo apt-get install openslide-tools` 또는 배포판에 맞게 libopenslide 설치

## 설치 및 실행

```bash
cd tile-server
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

실행 전 **WSI_DIR** 환경 변수를 WSI 파일이 있는 디렉터리로 설정한다.

```bash
# Windows (PowerShell) — OPENSLIDE_BIN은 OpenSlide DLL이 있는 bin 폴더( PATH에 없을 때만 )
$env:WSI_DIR = "C:\path\to\your\wsi\folder"
$env:OPENSLIDE_BIN = "C:\path\to\openslide-win64\bin"   # 필요 시
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# macOS/Linux
export WSI_DIR=/path/to/your/wsi/folder
uvicorn app.main:app --reload --port 8000
```

- `GET http://localhost:8000/health` → 서버 생존 확인
- `GET http://localhost:8000/api/slides` → 슬라이드 목록 (WSI_DIR 내 지원 확장자 파일)

## API 요약

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/slides | 슬라이드 목록 `{ items: [{ id, name }] }` |
| GET | /api/slides/{slide_id}/info | 메타정보 `{ width, height, levelCount, tileSize }` |
| GET | /api/slides/{slide_id}/tiles/{level}/{x}_{y}.jpg | 타일 이미지 (level, x, y는 정수) |
