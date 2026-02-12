import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMarkers } from '@/api/fetchMarkers'
import { fetchTumorAreas } from '@/api/fetchTumorAreas'
import { fetchSlides } from '@/api/fetchSlides'
import { fetchSlideInfo } from '@/api/fetchSlideInfo'
import { ImageMarkerViewer } from '@/components/ImageMarkerViewer'
import { WSIViewer } from '@/components/WSIViewer'
import { useViewerStore } from '@/stores/viewerStore'

function App() {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

  const {
    data: markers = [],
    isLoading: isLoadingMarkers,
    isError,
    error,
    refetch: refetchMarkers,
    isFetching: isFetchingMarkers,
  } = useQuery({
    queryKey: ['markers'],
    queryFn: fetchMarkers,
    refetchOnWindowFocus: false,
    enabled: false,
  })

  const {
    data: tumorAreas = [],
    refetch: refetchTumorAreas,
    isFetching: isFetchingTumorAreas,
  } = useQuery({
    queryKey: ['tumorAreas'],
    queryFn: fetchTumorAreas,
    refetchOnWindowFocus: false,
    enabled: false,
  })

  const { data: slides = [], isLoading: isLoadingSlides } = useQuery({
    queryKey: ['slides'],
    queryFn: fetchSlides,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { data: slideInfo } = useQuery({
    queryKey: ['slideInfo', selectedSlideId],
    queryFn: () => fetchSlideInfo(selectedSlideId!),
    enabled: !!selectedSlideId,
  })

  const isFetching = isFetchingMarkers || isFetchingTumorAreas
  const refetchAll = () => {
    refetchMarkers()
    refetchTumorAreas()
  }

  const overlayVisible = useViewerStore((s) => s.overlayVisible)
  const toggleOverlay = useViewerStore((s) => s.toggleOverlay)
  const layerVisibleTumorAreas = useViewerStore((s) => s.layerVisibleTumorAreas)
  const layerVisibleBoxMarkers = useViewerStore((s) => s.layerVisibleBoxMarkers)
  const layerVisiblePointMarkers = useViewerStore((s) => s.layerVisiblePointMarkers)
  const toggleLayerTumorAreas = useViewerStore((s) => s.toggleLayerTumorAreas)
  const toggleLayerBoxMarkers = useViewerStore((s) => s.toggleLayerBoxMarkers)
  const toggleLayerPointMarkers = useViewerStore((s) => s.toggleLayerPointMarkers)
  const selectedMarkerId = useViewerStore((s) => s.selectedMarkerId)
  const setSelectedMarkerId = useViewerStore((s) => s.setSelectedMarkerId)

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId)

  const layerBtn = (on: boolean, toggle: () => void, label: string) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        padding: '6px 12px',
        cursor: 'pointer',
        fontWeight: on ? 600 : 400,
        opacity: on ? 1 : 0.6,
      }}
      title={on ? `${label} 끄기` : `${label} 켜기`}
    >
      {label} {on ? 'ON' : 'OFF'}
    </button>
  )

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, marginRight: 4 }}>WSI:</span>
        <select
          value={selectedSlideId ?? ''}
          onChange={(e) => setSelectedSlideId(e.target.value || null)}
          style={{ padding: '4px 8px', minWidth: 120 }}
          title="타일 서버에서 불러온 슬라이드 목록"
        >
          <option value="">단일 이미지 모드</option>
          {isLoadingSlides && <option disabled>슬라이드 목록 로딩…</option>}
          {slides.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={refetchAll}
          disabled={isFetching}
          style={{ padding: '8px 16px', cursor: isFetching ? 'not-allowed' : 'pointer' }}
        >
          {isFetching ? '불러오는 중…' : '데이터 불러오기'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={overlayVisible}
            onChange={toggleOverlay}
          />
          오버레이 표시
        </label>
        <span style={{ marginLeft: 8, marginRight: 4, color: '#666', fontSize: 12 }}>레이어:</span>
        {layerBtn(layerVisibleTumorAreas, toggleLayerTumorAreas, 'tumor-areas')}
        {layerBtn(layerVisibleBoxMarkers, toggleLayerBoxMarkers, 'box-markers')}
        {layerBtn(layerVisiblePointMarkers, toggleLayerPointMarkers, 'point-markers')}
        {selectedMarker && (
          <span style={{ color: '#333' }}>
            선택: {selectedMarker.label}
            <button
              type="button"
              onClick={() => setSelectedMarkerId(null)}
              style={{ marginLeft: 8, fontSize: 12 }}
            >
              해제
            </button>
          </span>
        )}
      </div>

      {isLoadingMarkers && <p>마커 데이터를 불러오는 중…</p>}
      {isError && (
        <p style={{ color: 'crimson' }}>
          오류: {error instanceof Error ? error.message : '알 수 없는 오류'}
        </p>
      )}

      {selectedSlideId && slideInfo ? (
        <WSIViewer
          slideId={selectedSlideId}
          slideInfo={slideInfo}
          markers={markers}
          tumorAreas={tumorAreas}
        />
      ) : (
        <ImageMarkerViewer markers={markers} tumorAreas={tumorAreas} />
      )}
    </div>
  )
}

export default App
