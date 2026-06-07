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
  pathomit: number;       // discard paths shorter than N points (removes noise → smaller file)
  roundcoords: number;    // decimal places in coordinates (lower = smaller file)
}

export interface VectorizePreset {
  name: 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}

export const VECTORIZE_PRESETS: Record<VectorizePreset['name'], VectorizeSettings> = {
  logo: {
    numberofcolors: 5,
    ltres: 3.5,
    qtres: 3.5,
    colorsampling: 2,
    strokewidth: 1,
    scale: 1,
    pathomit: 28,
    roundcoords: 0,
  },
  sketch: {
    numberofcolors: 2,
    ltres: 2.5,
    qtres: 2.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 24,
    roundcoords: 0,
  },
  photo: {
    numberofcolors: 10,
    ltres: 2,
    qtres: 2,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 20,
    roundcoords: 0,
  },
};

// Aggressive, size-optimized defaults: strong noise removal, simplified curves,
// integer coordinates. Produces small files out of the box.
export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: 6,
  ltres: 2.8,
  qtres: 2.8,
  colorsampling: 2,
  strokewidth: 1,
  scale: 1,
  pathomit: 24,
  roundcoords: 0,
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
