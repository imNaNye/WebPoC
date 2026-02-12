import type { MarkerItem } from '@/types/marker'
import markersJson from '@/mocks/markers.json'

const MOCK_DELAY_MS = 600

export async function fetchMarkers(): Promise<MarkerItem[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
  return markersJson as MarkerItem[]
}
