declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    numberofcolors?: number;
    pal?: Array<{ r: number; g: number; b: number; a: number }>;
    colorquantcycles?: number;
    mincolorratio?: number;
    ltres?: number;
    qtres?: number;
    colorsampling?: number;
    strokewidth?: number;
    scale?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    blurradius?: number;
    blurdelta?: number;
    layering?: number;
    linefilter?: boolean;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
  }

  interface ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }

  const ImageTracer: {
    imagedataToSVG(imageData: ImageData, options?: ImageTracerOptions | string): string;
    imagedataToTracedata(imageData: ImageData, options?: ImageTracerOptions | string): unknown;
  };

  export = ImageTracer;
}
