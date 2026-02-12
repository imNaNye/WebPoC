import { useState } from 'react'
import DeckGL from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { MarkerItem, TumorArea } from '@/types/marker'
import { isBoxMarker } from '@/types/marker'
import { useViewerStore } from '@/stores/viewerStore'

const IMAGE_WIDTH = 800
const IMAGE_HEIGHT = 600

const view = new OrthographicView({
  id: 'ortho',
  controller: true,
  flipY: true,
})

interface ImageMarkerViewerProps {
  markers: MarkerItem[]
  tumorAreas?: TumorArea[]
  imageSrc?: string
}

// OrthographicView flipY: true => top-left origin, image (x,y) = world (x,y)

/** 폴리곤이 닫혀 있지 않으면 첫 점을 끝에 붙여 닫음 */
function closePolygon(polygon: [number, number][]): [number, number][] {
  if (polygon.length < 3) return polygon
  const [first] = polygon
  const last = polygon[polygon.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return polygon
  return [...polygon, first]
}

export function ImageMarkerViewer({ markers, tumorAreas = [], imageSrc }: ImageMarkerViewerProps) {
  const [loaded, setLoaded] = useState(false)
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

  const layers: Layer[] = []
  if (overlayVisible) {
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

  const initialViewState = {
    target: [IMAGE_WIDTH / 2, IMAGE_HEIGHT / 2, 0],
    zoom: 0,
    minZoom: -2,
    maxZoom: 4,
  }

  const defaultImageSrc = 'https://placehold.co/800x600/1a1a2e/eee?text=Sample+Image'

  return (
    <div
      style={{
        position: 'relative',
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <img
        src={imageSrc ?? defaultImageSrc}
        alt="Sample"
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <DeckGL
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          views={[view]}
          initialViewState={initialViewState}
          controller={true}
          layers={layers}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'auto' }}
        />
      )}
    </div>
  )
}
