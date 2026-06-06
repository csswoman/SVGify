import ImageTracer from 'imagetracerjs';
import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, settings } = event.data;

  if (type === 'vectorize' && imageData && settings) {
    try {
      vectorizeImage(imageData, settings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      self.postMessage({ type: 'error', message } satisfies WorkerResponse);
    }
  }
};

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings): void {
  try {
    // Merge with defaults
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    // Call imagetracerjs
    const svgString = ImageTracer.imagedataToSVG(imageData, {
      numberofcolors: options.numberofcolors,
      ltres: options.ltres,
      qtres: options.qtres,
      colorsampling: options.colorsampling,
      strokewidth: options.strokewidth,
      scale: options.scale,
    });

    // Send result back
    self.postMessage({ type: 'done', svg: svgString } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
}
