import { useEffect, useRef, useState, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { MarkerItem, TumorArea } from '@/types/marker'
import { isBoxMarker } from '@/types/marker'
import { useViewerStore } from '@/stores/viewerStore'
import { TILE_SERVER_BASE_URL } from '@/api/config'
import type { SlideInfo } from '@/api/fetchSlideInfo'
import OpenSeadragon from 'openseadragon'

const VIEWER_WIDTH = 800
const VIEWER_HEIGHT = 600

const orthoView = new OrthographicView({
  id: 'ortho',
  controller: false,
  flipY: true,
})

interface WSIViewerProps {
  slideId: string
  slideInfo: SlideInfo
  markers: MarkerItem[]
  tumorAreas?: TumorArea[]
}

function closePolygon(polygon: [number, number][]): [number, number][] {
  if (polygon.length < 3) return polygon
  const [first] = polygon
  const last = polygon[polygon.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return polygon
  return [...polygon, first]
}

export function WSIViewer({ slideId, slideInfo, markers, tumorAreas = [] }: WSIViewerProps) {
  const osdContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<{
    viewport: {
      getCenter(current?: boolean): { x: number; y: number }
      getZoom(current?: boolean): number
      getBounds(current?: boolean): { x: number; y: number; width: number; height: number }
      viewportToImageCoordinates(x: number, y: number): { x: number; y: number }
      viewportToImageRectangle(x: number, y: number, w: number, h: number): { x: number; y: number; width: number; height: number }
      viewportToImageZoom(viewportZoom: number): number
    }
    addHandler: (e: string, h: () => void) => void
    destroy: () => void
  } | null>(null)
  const [osdReady, setOsdReady] = useState(false)
  const [viewState, setViewState] = useState(() => ({
    target: [slideInfo.width / 2, slideInfo.height / 2, 0] as [number, number, number],
    zoom: Math.log2(0.5),
    minZoom: -4,
    maxZoom: 8,
  }))

  useEffect(() => {
    setViewState((prev) => ({
      ...prev,
      target: [slideInfo.width / 2, slideInfo.height / 2, 0],
    }))
  }, [slideId, slideInfo.width, slideInfo.height])

  const overlayVisible = useViewerStore((s) => s.overlayVisible)
  const layerVisibleTumorAreas = useViewerStore((s) => s.layerVisibleTumorAreas)
  const layerVisibleBoxMarkers = useViewerStore((s) => s.layerVisibleBoxMarkers)
  const layerVisiblePointMarkers = useViewerStore((s) => s.layerVisiblePointMarkers)
  const selectedMarkerId = useViewerStore((s) => s.selectedMarkerId)
  const setSelectedMarkerId = useViewerStore((s) => s.setSelectedMarkerId)

  const pointMarkers = markers.filter((m) => !isBoxMarker(m))
  const boxMarkers = markers.filter(isBoxMarker)
  const scatterData = pointMarkers.map((m) => ({
    id: m.id,
    position: [m.x, m.y, 0] as [number, number, number],
    label: m.label,
    selected: m.id === selectedMarkerId,
  }))
  const polygonData = boxMarkers.map((m) => ({
    id: m.id,
    polygon: [
      [m.x, m.y],
      [m.x + m.width, m.y],
      [m.x + m.width, m.y + m.height],
      [m.x, m.y + m.height],
      [m.x, m.y],
    ] as [number, number][],
    label: m.label,
    selected: m.id === selectedMarkerId,
  }))

  const syncViewport = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const vp = viewer.viewport
    const bounds = vp.getBounds(true)
    const imageRect = vp.viewportToImageRectangle(bounds.x, bounds.y, bounds.width, bounds.height)
    const centerX = imageRect.x + imageRect.width / 2
    const centerY = imageRect.y + imageRect.height / 2
    const viewportZoom = vp.getZoom(true)
    const imageZoom = vp.viewportToImageZoom(viewportZoom)
    setViewState((prev) => ({
      ...prev,
      target: [centerX, centerY, 0],
      zoom: Math.log2(Math.max(0.001, imageZoom)),
    }))
  }, [])

  useEffect(() => {
    const container = osdContainerRef.current
    if (!container || !slideId || !slideInfo) return

    const levelCount = slideInfo.levelCount
    const maxLevel = levelCount - 1
    const getTileUrl = (level: number, x: number, y: number) => {
      const serverLevel = maxLevel - level
      return `${TILE_SERVER_BASE_URL}/api/slides/${encodeURIComponent(slideId)}/tiles/${serverLevel}/${x}_${y}.jpg`
    }

    const viewer = OpenSeadragon({
      element: container,
      tileSources: {
        width: slideInfo.width,
        height: slideInfo.height,
        tileSize: slideInfo.tileSize,
        minLevel: 0,
        maxLevel,
        getTileUrl,
      },
      showNavigator: false,
    })

    viewer.addHandler('canvas-scroll', (e: { preventDefaultAction: boolean; scroll: number }) => {
      e.preventDefaultAction = true
      const factor = Math.pow((viewer as unknown as { zoomPerScroll: number }).zoomPerScroll, e.scroll)
      const center = viewer.viewport.getCenter(true)
      viewer.viewport.zoomBy(factor, center)
      viewer.viewport.applyConstraints()
    })

    viewer.addHandler('open', () => {
      setOsdReady(true)
      syncViewport()
    })
    viewer.addHandler('animation', syncViewport)
    viewer.addHandler('zoom', syncViewport)
    viewer.addHandler('pan', syncViewport)

    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
      setOsdReady(false)
    }
  }, [slideId, slideInfo, syncViewport])

  const layers: Layer[] = []
  if (overlayVisible && osdReady) {
    if (layerVisibleTumorAreas && tumorAreas.length > 0) {
      layers.push(
        new SolidPolygonLayer({
          id: 'tumor-areas',
          data: tumorAreas.map((t) => ({
            id: t.id,
            label: t.label,
            polygon: closePolygon(t.polygon),
          })),
          getPolygon: (d) => d.polygon,
          getFillColor: [200, 60, 80, 85],
          getLineColor: [180, 40, 60, 200],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
        }),
      )
    }
    if (layerVisibleBoxMarkers && polygonData.length > 0) {
      layers.push(
        new SolidPolygonLayer({
          id: 'box-markers',
          data: polygonData,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => (d.selected ? [255, 100, 100, 180] : [100, 200, 255, 120]),
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
          onClick: (info) => {
            if (info.object?.id) setSelectedMarkerId(String(info.object.id))
          },
        }),
      )
    }
    if (layerVisiblePointMarkers && scatterData.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'point-markers',
          data: scatterData,
          getPosition: (d) => d.position,
          getRadius: (d) => (d.selected ? 12 : 8),
          getFillColor: (d) => (d.selected ? [255, 100, 100, 220] : [255, 200, 0, 200]),
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
          onClick: (info) => {
            if (info.object?.id) setSelectedMarkerId(String(info.object.id))
          },
        }),
      )
    }
  }

  const imageZoom = Math.pow(2, viewState.zoom)
  const centerX = Math.round(viewState.target[0])
  const centerY = Math.round(viewState.target[1])

  return (
    <div
      style={{
        position: 'relative',
        width: VIEWER_WIDTH,
        height: VIEWER_HEIGHT,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '6px 10px',
          background: 'rgba(0, 0, 0, 0.65)',
          color: '#eee',
          fontSize: 12,
          fontFamily: 'ui-monospace, monospace',
          zIndex: 10,
          display: 'flex',
          gap: '16px',
        }}
      >
        <span>배율: {imageZoom.toFixed(2)}×</span>
        <span>중심: ({centerX}, {centerY})</span>
      </div>
      <div
        ref={osdContainerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: VIEWER_WIDTH,
          height: VIEWER_HEIGHT,
        }}
      />
      {osdReady && (
        <DeckGL
          width={VIEWER_WIDTH}
          height={VIEWER_HEIGHT}
          views={[orthoView]}
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
          controller={false}
          layers={layers}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  )
}
