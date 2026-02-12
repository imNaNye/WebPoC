import { create } from 'zustand'

interface ViewerState {
  selectedMarkerId: string | null
  overlayVisible: boolean
  layerVisibleTumorAreas: boolean
  layerVisibleBoxMarkers: boolean
  layerVisiblePointMarkers: boolean
  setSelectedMarkerId: (id: string | null) => void
  setOverlayVisible: (visible: boolean) => void
  toggleOverlay: () => void
  toggleLayerTumorAreas: () => void
  toggleLayerBoxMarkers: () => void
  toggleLayerPointMarkers: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedMarkerId: null,
  overlayVisible: true,
  layerVisibleTumorAreas: true,
  layerVisibleBoxMarkers: true,
  layerVisiblePointMarkers: true,
  setSelectedMarkerId: (id) => set({ selectedMarkerId: id }),
  setOverlayVisible: (visible) => set({ overlayVisible: visible }),
  toggleOverlay: () => set((s) => ({ overlayVisible: !s.overlayVisible })),
  toggleLayerTumorAreas: () => set((s) => ({ layerVisibleTumorAreas: !s.layerVisibleTumorAreas })),
  toggleLayerBoxMarkers: () => set((s) => ({ layerVisibleBoxMarkers: !s.layerVisibleBoxMarkers })),
  toggleLayerPointMarkers: () => set((s) => ({ layerVisiblePointMarkers: !s.layerVisiblePointMarkers })),
}))
