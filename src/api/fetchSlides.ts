import { TILE_SERVER_BASE_URL } from './config'

export interface SlideItem {
  id: string
  name: string
}

export interface SlidesResponse {
  items: SlideItem[]
}

export async function fetchSlides(): Promise<SlideItem[]> {
  const res = await fetch(`${TILE_SERVER_BASE_URL}/api/slides`)
  if (!res.ok) throw new Error(`Slides API failed: ${res.status}`)
  const data = (await res.json()) as SlidesResponse
  return data.items
}
