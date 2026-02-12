declare module 'openseadragon' {
  interface Point {
    x: number
    y: number
  }
  interface Viewport {
    getCenter(): Point
    getZoom(): number
    getBounds(): { x: number; y: number; width: number; height: number }
  }
  interface Viewer {
    viewport: Viewport
    addHandler(event: string, handler: () => void): void
    destroy(): void
  }
  interface TileSourceOptions {
    type?: string
    width: number
    height: number
    tileSize: number
    minLevel?: number
    maxLevel?: number
    getTileUrl: (level: number, x: number, y: number) => string
  }
  interface Options {
    element: HTMLElement
    tileSources: TileSourceOptions
    showNavigator?: boolean
  }
  function main(options: Options): Viewer
  export = main
}
