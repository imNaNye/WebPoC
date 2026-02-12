# 이미지 마커 오버레이 PoC

React 18 + Vite + Zustand + React Query + deck.gl + OpenSeaDragon 스터디용 PoC.  
이미지 또는 WSI(타일 서버) 위에 마커·tumor area를 deck.gl로 오버레이합니다.

**실행 (프론트만)**

```bash
npm install
npm run dev
```

- 상단에서 "단일 이미지 모드"면 기존 단일 이미지 + 오버레이. "WSI" 슬라이드를 선택하면 타일 서버에서 해당 슬라이드를 불러와 OpenSeaDragon으로 표시합니다.

**타일 서버 (WSI 뷰어 사용 시)**

1. Python 3.10+, OpenSlide C 라이브러리 설치.
2. WSI 파일(.ndpi, .svs, .tif 등)을 넣을 디렉터리 준비 후, 해당 경로를 `WSI_DIR` 환경 변수로 지정.
3. 타일 서버 실행:

```bash
cd tile-server
pip install -r requirements.txt
# Windows: $env:WSI_DIR = "C:\path\to\wsi"
# macOS/Linux: export WSI_DIR=/path/to/wsi
uvicorn app.main:app --reload --port 8000
```

4. 프론트에서 타일 서버 URL이 `http://localhost:8000`이 아니면 `.env`에 `VITE_TILE_SERVER_URL` 설정 후 `npm run dev` 재시작.
