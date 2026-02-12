import type { TumorArea } from '@/types/marker'
import tumorAreasJson from '@/mocks/tumorAreas.json'

const MOCK_DELAY_MS = 400

export async function fetchTumorAreas(): Promise<TumorArea[]> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
  return tumorAreasJson as TumorArea[]
}
