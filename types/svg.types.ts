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

/** Choices that the product deliberately exposes to a person. */
export interface VectorizeProductSettings {
  traceMode: 'standard' | 'icon';
  detailLevel: VectorizeDetailLevel;
  numberofcolors: number;
  customPalette?: RGBColor[];
  colorPrecision: number;
  cornerThreshold: number;
  bilateralRadius: number;
  alphaThreshold: number;
  colorQuantCycles: number;
}

/** Internal VTracer configuration; never edited directly by the UI. */
export interface VectorizeSettings extends VectorizeProductSettings {
  filterSpeckle: number;       // discard small patches
  pathPrecision: number;       // SVG coordinate decimals
  layerDifference: number;     // color difference between gradient layers
  lengthThreshold: number;     // spline subdivision segment length
  maxIterations: number;       // spline smoothing iterations
  spliceThreshold: number;     // spline splice angle
  preprocessingScale: number;  // raster upscale before vectorize
  bilateralColorSigma: number; // edge preservation threshold
  paletteMergeThreshold: number; // merge near-duplicate output colors
  /** Opaque matte was removed client-side; icon preprocess may fold dark fringe shades. */
  matteReconstructed?: boolean;
}

export const VECTORIZE_PRODUCT_DEFAULTS: VectorizeProductSettings = {
  traceMode: 'standard',
  detailLevel: 'balanced',
  numberofcolors: DEFAULT_COLOR_COUNT,
  colorPrecision: DEFAULT_COLOR_PRECISION,
  cornerThreshold: 60,
  bilateralRadius: 1,
  alphaThreshold: 180,
  colorQuantCycles: 6,
};

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  ...VECTORIZE_PRODUCT_DEFAULTS,
  filterSpeckle: 6,
  pathPrecision: 2,
  layerDifference: 10,
  lengthThreshold: 6,
  maxIterations: 2,
  spliceThreshold: 45,
  preprocessingScale: 1,
  bilateralColorSigma: 32,
  paletteMergeThreshold: 44,
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
