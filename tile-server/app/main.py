"""
FastAPI 애플리케이션 진입점. CORS 설정과 라우터 등록.

CORS(Cross-Origin Resource Sharing): 브라우저는 기본적으로 "다른 출처(origin)"의
서버로 요청을 보낼 수 있지만, 서버가 허용 헤더를 보내지 않으면 프론트(예: localhost:5173)에서
API(예: localhost:8000)로의 요청 응답을 JavaScript에서 읽을 수 없다.
따라서 타일 서버에서 프론트 오리진을 허용해 준다.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.slides import router as slides_router

app = FastAPI(title="WSI Tile Server", description="Serve WSI as tiles for OpenSeaDragon")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(slides_router)


@app.get("/health")
def health():
    """서버 생존 확인용. 배포/헬스체크에서 사용."""
    return {"status": "ok"}
