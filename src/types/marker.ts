export interface Marker {
  id: string
  x: number
  y: number
  label: string
}

export interface BoxMarker {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
}

export type MarkerItem = Marker | BoxMarker

/** 영역 데이터 (예: tumor area). 폴리곤 꼭짓점 배열, 이미지 픽셀 좌표. */
export interface TumorArea {
  id: string
  label: string
  /** 폴리곤 꼭짓점 [x, y] 배열 (닫힌 영역: 마지막 점은 첫 점과 연결) */
  polygon: [number, number][]
}

export function isBoxMarker(m: MarkerItem): m is BoxMarker {
  return 'width' in m && 'height' in m
}
