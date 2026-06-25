import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { optimizeSvg, svgByteSize } from '@/lib/optimizeSvg';
import { applyBlur, buildIconSilhouette } from '@/lib/imageFilters';
import { downscaleForTrace, traceIconByColorLayers } from '@/lib/iconLayerTrace';
import {
  quantizeImageToIconPalette,
  removeSmallNearWhiteSvgPaths,
  removeSmallSvgPathsByBounds,
  snapSvgToIconPalette,
} from '@/lib/iconVectorization';
import { simplifySvgPaths } from '@/lib/simplifyPath';
import { compactSvgPaths } from '@/lib/svgPathCompaction';
import {
  applyAlphaMask,
  mergeSimilarPaletteColors,
  smoothQuantizedPalette,
  suggestPaletteFromImage,
  isDropShadowColor,
  type TracePaletteColor as IconTracePaletteColor,
} from '@/lib/paletteExtraction';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

const TARGET_SVG_BYTES = 50 * 1024;

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

function optimizeWithinBudget(svg: string, coordDecimals: number): string {
  const optimized = optimizeSvg(svg, {
    dropDefaultOpacity: true,
    coordDecimals,
    removeStroke: true,
  });

  if (svgByteSize(optimized) <= TARGET_SVG_BYTES) return optimized;

  const attempts = [
    { epsilon: 0.18, decimals: Math.min(coordDecimals, 1) },
    { epsilon: 0.28, decimals: Math.min(coordDecimals, 1) },
    { epsilon: 0.4, decimals: 0 },
    { epsilon: 0.55, decimals: 0 },
  ];

  let best = optimized;
  let bestSize = svgByteSize(best);

  for (const attempt of attempts) {
    const simplified = simplifySvgPaths(svg, attempt.epsilon, attempt.decimals);
    const candidate = optimizeSvg(simplified, {
      dropDefaultOpacity: true,
      coordDecimals: attempt.decimals,
      removeStroke: true,
    });
    const candidateSize = svgByteSize(candidate);

    if (candidateSize < bestSize) {
      best = candidate;
      bestSize = candidateSize;
    }
    if (candidateSize <= TARGET_SVG_BYTES) return candidate;
  }

  return best;
}

function vectorizeIcon(withoutWhite: ImageData, settings: VectorizeSettings): string {
  const source = downscaleForTrace(withoutWhite);
  const targetColors = Math.max(2, Math.min(settings.numberofcolors, 24));
  const rawTraceColors: IconTracePaletteColor[] =
    settings.customPalette && settings.customPalette.length > 0
      ? settings.customPalette.slice(0, targetColors).map((color) => ({ ...color, a: 255 }))
      : suggestPaletteFromImage(source, targetColors);
  const mergeThreshold = targetColors >= 18 ? 8 : targetColors >= 12 ? 14 : 22;
  const traceColors = mergeSimilarPaletteColors(rawTraceColors, mergeThreshold).map((color) => ({
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
  const snapped = snapSvgToIconPalette(withoutTransparent, traceColors);
  const minPathArea = Math.max(8, Math.round(settings.pathomit * 0.4));
  const shadowColors = traceColors.filter((color) => isDropShadowColor(color));
  const withoutWhiteSpeckles = removeSmallNearWhiteSvgPaths(snapped, minPathArea);
  const withoutSpeckles = removeSmallSvgPathsByBounds(withoutWhiteSpeckles, minPathArea, shadowColors);
  const coordDecimals = Math.max(0, settings.roundcoords);

  const compacted = compactSvgPaths(withoutSpeckles, 50);

  return optimizeWithinBudget(compacted, coordDecimals);
}

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings, requestId: number): void {
  try {
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    const optimized = vectorizeIcon(imageData, {
      ...options,
      numberofcolors: Math.max(2, Math.min(options.numberofcolors, 24)),
      pathomit: Math.max(0, Math.min(options.pathomit, 40)),
      roundcoords: Math.max(0, Math.min(options.roundcoords, 3)),
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
