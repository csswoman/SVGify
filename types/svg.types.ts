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
  numberofcolors: number; // 2-256
  ltres: number;          // 0.1-5
  qtres: number;          // 0.1-5
  colorsampling: number;  // 0-n
  strokewidth: number;    // 1-5
  scale: number;
}

export interface VectorizePreset {
  name: 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}

export const VECTORIZE_PRESETS: Record<VectorizePreset['name'], VectorizeSettings> = {
  logo: {
    numberofcolors: 4,
    ltres: 2,
    qtres: 1,
    colorsampling: 2,
    strokewidth: 1,
    scale: 1,
  },
  sketch: {
    numberofcolors: 2,
    ltres: 0.5,
    qtres: 0.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
  },
  photo: {
    numberofcolors: 16,
    ltres: 0.5,
    qtres: 0.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
  },
};

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: 8,
  ltres: 1,
  qtres: 1,
  colorsampling: 2,
  strokewidth: 1,
  scale: 1,
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
