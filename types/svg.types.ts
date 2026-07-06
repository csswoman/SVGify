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

export const DEFAULT_COLOR_PRECISION = 4;
export const DEFAULT_COLOR_COUNT = 2 ** DEFAULT_COLOR_PRECISION;

export interface VectorizeSettings {
  numberofcolors: number;      // UI alias for vtracer colorPrecision estimate
  customPalette?: RGBColor[];  // User-approved palette for icon mode
  colorPrecision: number;      // 1-8 significant RGB bits per channel
  filterSpeckle: number;       // discard small patches
  cornerThreshold: number;     // degrees; higher = fewer corners
  pathPrecision: number;       // SVG coordinate decimals
  layerDifference: number;     // color difference between gradient layers
  lengthThreshold: number;     // spline subdivision segment length
  maxIterations: number;       // spline smoothing iterations
  spliceThreshold: number;     // spline splice angle
  preprocessingScale: number;  // raster upscale before vectorize
  bilateralRadius: number;     // edge-preserving prefilter radius
  bilateralColorSigma: number; // edge preservation threshold
  alphaThreshold: number;      // semi-transparent pixels below this become transparent
  paletteMergeThreshold: number; // merge near-duplicate output colors
  colorQuantCycles: number;    // legacy palette suggestion only
  ltres: number;               // legacy, ignored by vtracer
  qtres: number;               // legacy, ignored by vtracer
  strokewidth: number;         // legacy, ignored by vtracer
  scale: number;
  pathomit: number;            // legacy alias for filterSpeckle
  linePathOmit: number;        // legacy, ignored by vtracer
  roundcoords: number;         // legacy alias for pathPrecision
  blurRadius: number;          // legacy alias for bilateralRadius
  blurDelta: number;           // legacy, ignored by vtracer
  traceScale: number;          // legacy alias for preprocessingScale
  fillOverlap: number;         // legacy, ignored by vtracer
  lineSmoothing: number;       // legacy, ignored by vtracer
  curveSmoothing: number;      // legacy, ignored by vtracer
}

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: DEFAULT_COLOR_COUNT,
  colorPrecision: DEFAULT_COLOR_PRECISION,
  filterSpeckle: 6,
  cornerThreshold: 60,
  pathPrecision: 2,
  layerDifference: 10,
  lengthThreshold: 6,
  maxIterations: 2,
  spliceThreshold: 45,
  preprocessingScale: 1,
  bilateralRadius: 1,
  bilateralColorSigma: 32,
  alphaThreshold: 180,
  paletteMergeThreshold: 44,
  colorQuantCycles: 6,
  ltres: 0.9,
  qtres: 0.8,
  strokewidth: 0,
  scale: 1,
  pathomit: 6,
  linePathOmit: 2,
  roundcoords: 2,
  blurRadius: 1,
  blurDelta: 20,
  traceScale: 1,
  fillOverlap: 0,
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
