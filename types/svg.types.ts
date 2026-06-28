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
  strokewidth: number;         // 0-2; same-color stroke used to seal seams
  scale: number;
  pathomit: number;
  linePathOmit: number;        // low speckle omit for dark outline masks
  roundcoords: number;
  blurRadius: number;          // 0 = off, 1-5
  blurDelta: number;           // ImageTracer blur edge threshold
  traceScale: number;          // raster upscale before quantize/trace
  fillOverlap: number;         // px dilation for non-line fills before tracing
  lineSmoothing: number;       // extra denoise passes for line masks
  curveSmoothing: number;      // 0 = polygon, 1-2 = quadratic curve smoothing
}

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: 12,
  ltres: 1.2,
  qtres: 1,
  strokewidth: 1,
  scale: 1,
  pathomit: 18,
  linePathOmit: 2,
  roundcoords: 1,
  blurRadius: 1,
  blurDelta: 20,
  traceScale: 2,
  fillOverlap: 1,
  lineSmoothing: 1,
  curveSmoothing: 1,
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
