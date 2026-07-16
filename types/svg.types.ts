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

/** Human-readable trade-off applied to the tracer's internal parameters. */
export type VectorizeDetailLevel = 'clean' | 'balanced' | 'detailed';

export interface VectorizeSettings {
  traceMode: 'standard' | 'icon';
  detailLevel: VectorizeDetailLevel;
  numberofcolors: number;      // UI alias for vtracer colorPrecision estimate
  customPalette?: RGBColor[];  // User-approved palette used by both trace modes
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
  colorQuantCycles: number;    // palette suggestion passes
}

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  traceMode: 'standard',
  detailLevel: 'balanced',
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
