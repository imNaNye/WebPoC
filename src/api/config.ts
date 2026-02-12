/**
 * 타일 서버 base URL.
 * Vite는 VITE_ 접두사 환경 변수를 import.meta.env.VITE_* 로 노출한다.
 * 빌드 시점에 치환되므로 .env 또는 .env.local 에서 설정.
 */
export const TILE_SERVER_BASE_URL =
  (import.meta.env.VITE_TILE_SERVER_URL as string) || 'http://localhost:8000'
