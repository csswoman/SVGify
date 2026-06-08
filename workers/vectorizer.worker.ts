import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { optimizeSvg } from '@/lib/optimizeSvg';
import { applyBlur, buildIconSilhouette } from '@/lib/imageFilters';
import { downscaleForTrace, traceIconByColorLayers } from '@/lib/iconLayerTrace';
import {
  quantizeImageToIconPalette,
  prepareIconSourceImage,
  removeNearWhiteSvgPaths,
  removeSmallSvgPathsByBounds,
  snapSvgToIconPalette,
} from '@/lib/iconVectorization';
import {
  applyAlphaMask,
  mergeSimilarPaletteColors,
  smoothQuantizedPalette,
  suggestPaletteFromImage,
  type TracePaletteColor as IconTracePaletteColor,
} from '@/lib/paletteExtraction';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

let activeRequestId = 0;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, settings, requestId } = event.data;

  if (type === 'cancel') {
    activeRequestId += 1;
    return;
  }

  if (type === 'vectorize' && imageData && settings) {
    const jobId = requestId ?? ++activeRequestId;
    activeRequestId = jobId;

    try {
      vectorizeImage(imageData, settings, jobId);
    } catch (err) {
      if (jobId !== activeRequestId) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      self.postMessage({ type: 'error', message, requestId: jobId } satisfies WorkerResponse);
    }
  }
};

function vectorizeIcon(withoutWhite: ImageData, settings: VectorizeSettings): string {
  const source = downscaleForTrace(withoutWhite);
  const targetColors = Math.max(2, Math.min(settings.numberofcolors, 12));
  const rawTraceColors: IconTracePaletteColor[] =
    settings.customPalette && settings.customPalette.length > 0
      ? settings.customPalette.slice(0, targetColors).map((color) => ({ ...color, a: 255 }))
      : suggestPaletteFromImage(source, targetColors);
  const traceColors = mergeSimilarPaletteColors(rawTraceColors, 22).map((color) => ({
    ...color,
    a: 255 as const,
  }));

  const quantizeBlur = Math.min(settings.blurRadius, 2);
  const quantizeSource = quantizeBlur > 0 ? applyBlur(source, quantizeBlur) : source;
  const quantized = quantizeImageToIconPalette(quantizeSource, traceColors);
  const smoothed = smoothQuantizedPalette(quantized, traceColors, settings.blurRadius);
  const silhouette = buildIconSilhouette(source, Math.min(settings.blurRadius, 3));
  const iconRaster = applyAlphaMask(smoothed, silhouette);

  const svgString = traceIconByColorLayers(iconRaster, traceColors, settings);

  const withoutTransparent = removeTransparentPaths(svgString);
  const withoutWhitePaths = removeNearWhiteSvgPaths(withoutTransparent);
  const snapped = snapSvgToIconPalette(withoutWhitePaths, traceColors);
  const minPathArea = Math.max(12, Math.round(settings.pathomit * 0.5));
  const withoutSpeckles = removeSmallSvgPathsByBounds(snapped, minPathArea);
  const coordDecimals = Math.max(2, settings.roundcoords);

  // Keep ImageTracer curve commands intact. Aggressive Douglas–Peucker
  // simplification is only applied via "Optimize to the max" in the UI.
  return optimizeSvg(withoutSpeckles, {
    dropDefaultOpacity: true,
    coordDecimals,
    removeStroke: true,
    sealSeams: 0.35,
  });
}

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings, requestId: number): void {
  try {
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    const prepared = prepareIconSourceImage(imageData);
    const optimized = vectorizeIcon(prepared, {
      ...options,
      numberofcolors: Math.max(2, Math.min(options.numberofcolors, 12)),
      pathomit: Math.max(12, Math.min(options.pathomit, 24)),
    });

    if (requestId !== activeRequestId) return;
    self.postMessage({ type: 'done', svg: optimized, requestId } satisfies WorkerResponse);
  } catch (err) {
    if (requestId !== activeRequestId) return;
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message, requestId } satisfies WorkerResponse);
  }
}

function removeTransparentPaths(svg: string): string {
  return svg.replace(/<path\b(?=[^>]*\bopacity="0(?:\.0+)?")[^>]*>/g, '');
}
