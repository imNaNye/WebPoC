import { TILE_SERVER_BASE_URL } from './config'

export interface SlideInfo {
  width: number
  height: number
  levelCount: number
  tileSize: number
  /** 각 OpenSlide 레벨의 [width, height]. levelDimensions[0] = 최고 해상도. */
  levelDimensions?: [number, number][]
  /** 각 레벨의 다운샘플 배율 (float). 2가 아니면 OSD 2^n 가정과 불일치. */
  levelDownsamples?: number[]
}

export async function fetchSlideInfo(slideId: string): Promise<SlideInfo> {
  const res = await fetch(`${TILE_SERVER_BASE_URL}/api/slides/${encodeURIComponent(slideId)}/info`)
  if (!res.ok) throw new Error(`Slide info failed: ${res.status}`)
  return res.json() as Promise<SlideInfo>
}
