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

export interface VectorizeSettings {
  mode: 'color' | 'lineart';
  numberofcolors: number;      // 2-12 (ignored in lineart mode)
  ltres: number;               // 0.1-5
  qtres: number;               // 0.1-5
  colorsampling: number;
  strokewidth: number;         // 1-5
  scale: number;
  pathomit: number;
  roundcoords: number;
  blurRadius: number;          // 0 = off, 1-5
  vtracerFilterSpeckle: number;    // 2-16, VTracer noise filter
  vtracerCornerThreshold: number;  // 60-170 degrees
  vtracerSpliceThreshold: number;  // 15-90 degrees
}

export interface VectorizePreset {
  name: 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}

export const VECTORIZE_PRESETS: Record<VectorizePreset['name'], VectorizeSettings> = {
  logo: {
    mode: 'color',
    numberofcolors: 5,
    ltres: 3.5,
    qtres: 3.5,
    colorsampling: 2,
    strokewidth: 1,
    scale: 1,
    pathomit: 28,
    roundcoords: 0,
    blurRadius: 0,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
  sketch: {
    mode: 'lineart',
    numberofcolors: 2,
    ltres: 2.5,
    qtres: 2.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 24,
    roundcoords: 1,
    blurRadius: 1,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
  photo: {
    mode: 'color',
    numberofcolors: 10,
    ltres: 2,
    qtres: 2,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 20,
    roundcoords: 0,
    blurRadius: 1,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
};

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  mode: 'color',
  numberofcolors: 6,
  ltres: 2.8,
  qtres: 2.8,
  colorsampling: 2,
  strokewidth: 1,
  scale: 1,
  pathomit: 24,
  roundcoords: 0,
  blurRadius: 1,
  vtracerFilterSpeckle: 4,
  vtracerCornerThreshold: 60,
  vtracerSpliceThreshold: 45,
};

export interface WorkerMessage {
  type: 'vectorize' | 'cancel';
  imageData?: ImageData;
  settings?: VectorizeSettings;
}

export interface WorkerResponse {
  type: 'ready' | 'progress' | 'done' | 'error';
  value?: number;        // progress: 0..1
  svg?: string;          // done
  message?: string;      // error
}
