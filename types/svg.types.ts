// All strict, no `any`

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface SVGPath {
  id: string;
  d: string;
  fill: RGBColor;
  stroke?: RGBColor;
  opacity?: number;
  label?: string;
}

export interface SVGDocument {
  svg: SVGElement;
  paths: SVGPath[];
  width: number;
  height: number;
}

export interface SvgZoomViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const MIN_ZOOM_SCALE = 0.25;
export const MAX_ZOOM_SCALE = 8;
export const DEFAULT_ZOOM_SCALE = 1.0;

export const DEFAULT_ZOOM_VIEWPORT: SvgZoomViewport = {
  scale: DEFAULT_ZOOM_SCALE,
  offsetX: 0,
  offsetY: 0,
};

export interface VectorizeSettings {
  numberofcolors: number;      // 2-24
  customPalette?: RGBColor[];  // User-approved palette for icon mode
  ltres: number;               // 0.1-5
  qtres: number;               // 0.1-5
  strokewidth: number;         // 1-5
  scale: number;
  pathomit: number;
  roundcoords: number;
  blurRadius: number;          // 0 = off, 1-5
}

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: 12,
  ltres: 1.2,
  qtres: 1,
  strokewidth: 1,
  scale: 1,
  pathomit: 18,
  roundcoords: 1,
  blurRadius: 1,
};

export interface WorkerMessage {
  type: 'vectorize' | 'cancel';
  requestId?: number;
  imageData?: ImageData;
  settings?: VectorizeSettings;
}

export interface WorkerResponse {
  type: 'ready' | 'progress' | 'done' | 'error';
  requestId?: number;
  value?: number;        // progress: 0..1
  svg?: string;          // done
  message?: string;      // error
}
