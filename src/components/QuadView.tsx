import { useRef, useCallback, useEffect } from 'react'
import { WSIViewer, type WSIViewerRef } from '@/components/WSIViewer'
import { useViewerStore } from '@/stores/viewerStore'
import type { SlideInfo } from '@/api/fetchSlideInfo'
import type { SlideItem } from '@/api/fetchSlides'
import type { MarkerItem, TumorArea } from '@/types/marker'

const PANEL_WIDTH = 400
const PANEL_HEIGHT = 300

interface QuadViewProps {
  panelSlots: (string | null)[]
  setPanelSlot: (index: number, slideId: string | null) => void
  slides: SlideItem[]
  slideInfos: (SlideInfo | undefined)[]
  markers: MarkerItem[]
  tumorAreas: TumorArea[]
}

export function QuadView({
  panelSlots,
  setPanelSlot,
  slides,
  slideInfos,
  markers,
  tumorAreas,
}: QuadViewProps) {
  const syncMode = useViewerStore((s) => s.syncMode)
  const setSyncMode = useViewerStore((s) => s.setSyncMode)
  const focusedPanelIndex = useViewerStore((s) => s.focusedPanelIndex)
  const setFocusedPanel = useViewerStore((s) => s.setFocusedPanel)

  const ref0 = useRef<WSIViewerRef | null>(null)
  const ref1 = useRef<WSIViewerRef | null>(null)
  const ref2 = useRef<WSIViewerRef | null>(null)
  const ref3 = useRef<WSIViewerRef | null>(null)
  const viewerRefs = [ref0, ref1, ref2, ref3] as const
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null)
  const isSyncingRef = useRef(false)

  const isFinitePoint = (p: { x: number; y: number }) =>
    Number.isFinite(p.x) && Number.isFinite(p.y)

  const syncPanFrom = useCallback(
    (panelIndex: number) => {
      if (!syncMode || isSyncingRef.current) return
      const vp = viewerRefs[panelIndex].current?.getViewport()
      if (!vp) return
      const center = vp.getCenter(true)
      if (!isFinitePoint(center)) return
      const prev = lastCenterRef.current
      if (prev != null && isFinitePoint(prev)) {
        const delta = { x: center.x - prev.x, y: center.y - prev.y }
        if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return
        isSyncingRef.current = true
        try {
          ;[0, 1, 2, 3].forEach((i) => {
            if (i === panelIndex) return
            viewerRefs[i].current?.getViewport()?.panBy(delta)
          })
        } finally {
          setTimeout(() => {
            isSyncingRef.current = false
          }, 0)
        }
      }
      lastCenterRef.current = center
    },
    [syncMode]
  )

  const syncZoomFrom = useCallback(
    (panelIndex: number) => {
      if (!syncMode || isSyncingRef.current) return
      const vp = viewerRefs[panelIndex].current?.getViewport()
      if (!vp) return
      const zoom = vp.getZoom(true)
      if (!Number.isFinite(zoom)) return
      isSyncingRef.current = true
      try {
        ;[0, 1, 2, 3].forEach((i) => {
          if (i === panelIndex) return
          const other = viewerRefs[i].current?.getViewport()
          if (other) other.zoomTo(zoom, other.getCenter(true))
        })
        const center = vp.getCenter(true)
        if (isFinitePoint(center)) lastCenterRef.current = center
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false
        }, 0)
      }
    },
    [syncMode]
  )

  const onFocus0 = useCallback(() => setFocusedPanel(0), [setFocusedPanel])
  const onFocus1 = useCallback(() => setFocusedPanel(1), [setFocusedPanel])
  const onFocus2 = useCallback(() => setFocusedPanel(2), [setFocusedPanel])
  const onFocus3 = useCallback(() => setFocusedPanel(3), [setFocusedPanel])
  const onPan0 = useCallback(() => syncPanFrom(0), [syncPanFrom])
  const onPan1 = useCallback(() => syncPanFrom(1), [syncPanFrom])
  const onPan2 = useCallback(() => syncPanFrom(2), [syncPanFrom])
  const onPan3 = useCallback(() => syncPanFrom(3), [syncPanFrom])
  const onZoom0 = useCallback(() => syncZoomFrom(0), [syncZoomFrom])
  const onZoom1 = useCallback(() => syncZoomFrom(1), [syncZoomFrom])
  const onZoom2 = useCallback(() => syncZoomFrom(2), [syncZoomFrom])
  const onZoom3 = useCallback(() => syncZoomFrom(3), [syncZoomFrom])
  const onFocusHandlers = [onFocus0, onFocus1, onFocus2, onFocus3]
  const onPanHandlers = [onPan0, onPan1, onPan2, onPan3]
  const onZoomHandlers = [onZoom0, onZoom1, onZoom2, onZoom3]

  useEffect(() => {
    if (!syncMode) return
    lastCenterRef.current = null
  }, [syncMode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={syncMode}
            onChange={(e) => setSyncMode(e.target.checked)}
          />
          동기화 모드
        </label>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 8,
          maxWidth: PANEL_WIDTH * 2 + 8 + 8,
        }}
      >
        {[0, 1, 2, 3].map((panelIndex) => {
          const slideId = panelSlots[panelIndex]
          const slideInfo = slideInfos[panelIndex]
          return (
            <div
              key={panelIndex}
              style={{
                position: 'relative',
                border: '1px solid #ccc',
                borderRadius: 4,
                overflow: 'hidden',
                minHeight: PANEL_HEIGHT,
              }}
              onMouseEnter={() => setFocusedPanel(panelIndex)}
              onClick={() => setFocusedPanel(panelIndex)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  right: 4,
                  zIndex: 20,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <select
                  value={slideId ?? ''}
                  onChange={(e) => setPanelSlot(panelIndex, e.target.value || null)}
                  style={{ padding: '4px 8px', fontSize: 12, maxWidth: 180 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">— 선택 —</option>
                  {slides.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {slideId != null && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPanelSlot(panelIndex, null)
                    }}
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    title="패널 닫기"
                  >
                    닫기
                  </button>
                )}
              </div>
              {slideId != null && slideInfo ? (
                <div style={{ paddingTop: 36 }}>
                  <WSIViewer
                    ref={viewerRefs[panelIndex]}
                    slideId={slideId}
                    slideInfo={slideInfo}
                    markers={markers}
                    tumorAreas={tumorAreas}
                    showScale={focusedPanelIndex === panelIndex}
                    width={PANEL_WIDTH}
                    height={PANEL_HEIGHT - 40}
                    onFocus={onFocusHandlers[panelIndex]}
                    onPan={onPanHandlers[panelIndex]}
                    onZoom={onZoomHandlers[panelIndex]}
                    onTileLoaded={undefined}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: PANEL_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888',
                    fontSize: 14,
                  }}
                >
                  슬라이드 선택
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
