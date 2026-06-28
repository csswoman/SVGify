import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { optimizeSvg, svgByteSize } from '@/lib/optimizeSvg';
import { applyBlur, buildIconSilhouette, upscaleImageData } from '@/lib/imageFilters';
import { downscaleForTrace, traceIconByColorLayers } from '@/lib/iconLayerTrace';
import {
  quantizeImageToIconPalette,
  removeSmallSvgPathsByBounds,
  snapSvgToIconPalette,
} from '@/lib/iconVectorization';
import { curveSmoothSvgPaths, simplifySvgPaths } from '@/lib/simplifyPath';
import { compactSvgPaths } from '@/lib/svgPathCompaction';
import {
  applyAlphaMask,
  isDarkOutlineColor,
  mergeSimilarPaletteColors,
  pickDarkOutlineColorFromImage,
  smoothQuantizedPalette,
  suggestPaletteFromImage,
  isDropShadowColor,
  luminance,
  type TracePaletteColor as IconTracePaletteColor,
} from '@/lib/paletteExtraction';
import { colorDistanceSq } from '@/lib/colorUtils';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

const TARGET_SVG_BYTES = 500 * 1024;

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

function optimizeWithinBudget(svg: string, coordDecimals: number, seamStrokeWidth: number): string {
  const sealSeams = seamStrokeWidth > 0 ? seamStrokeWidth : undefined;
  const optimized = optimizeSvg(svg, {
    dropDefaultOpacity: true,
    coordDecimals,
    sealSeams,
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
      sealSeams,
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
  const traceScale = Math.max(1, Math.min(2, Math.round(settings.traceScale)));
  const source = upscaleImageData(downscaleForTrace(withoutWhite, Math.round(720 / traceScale)), traceScale);
  const targetColors = Math.max(2, Math.min(settings.numberofcolors, 24));
  const rawTraceColors: IconTracePaletteColor[] =
    settings.customPalette && settings.customPalette.length > 0
      ? settings.customPalette.slice(0, targetColors).map((color) => ({ ...color, a: 255 }))
      : suggestPaletteFromImage(source, targetColors);
  const mergeThreshold = targetColors >= 18 ? 8 : targetColors >= 12 ? 14 : 22;
  const mergedTraceColors = mergeSimilarPaletteColors(rawTraceColors, mergeThreshold);
  const outlineColor = pickDarkOutlineColorFromImage(source);
  const fixedTraceColors =
    outlineColor && !mergedTraceColors.some((color) => isDarkOutlineColor(color))
      ? [...mergedTraceColors.slice(0, Math.max(0, targetColors - 1)), outlineColor]
      : mergedTraceColors;
  const traceColors = fixedTraceColors.map((color) => ({
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
  const protectedFillColors = traceColors.filter(
    (color) => luminance(color) >= 96 || isDarkOutlineColor(color) || shadowColors.some((shadow) => colorDistanceSq(shadow, color) <= 36 * 36)
  );
  const withoutSpeckles = removeSmallSvgPathsByBounds(snapped, minPathArea, protectedFillColors);
  const coordDecimals = Math.max(0, settings.roundcoords);

  const compacted = compactSvgPaths(withoutSpeckles, 50);
  const curved = curveSmoothSvgPaths(
    compacted,
    Math.max(0, Math.min(2, settings.curveSmoothing)),
    settings.curveSmoothing >= 2 ? 0.55 : 0.35,
    coordDecimals
  );

  const seamStrokeWidth = Math.max(0, Math.min(settings.strokewidth, 2));

  return optimizeWithinBudget(curved, coordDecimals, seamStrokeWidth);
}

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings, requestId: number): void {
  try {
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    const optimized = vectorizeIcon(imageData, {
      ...options,
      numberofcolors: Math.max(2, Math.min(options.numberofcolors, 24)),
      pathomit: Math.max(0, Math.min(options.pathomit, 40)),
      linePathOmit: Math.max(0, Math.min(options.linePathOmit, 12)),
      roundcoords: Math.max(0, Math.min(options.roundcoords, 3)),
      blurRadius: Math.max(0, Math.min(options.blurRadius, 5)),
      blurDelta: Math.max(1, Math.min(options.blurDelta, 64)),
      traceScale: Math.max(1, Math.min(options.traceScale, 2)),
      strokewidth: Math.max(0, Math.min(options.strokewidth, 2)),
      fillOverlap: Math.max(0, Math.min(options.fillOverlap, 2)),
      lineSmoothing: Math.max(0, Math.min(options.lineSmoothing, 2)),
      curveSmoothing: Math.max(0, Math.min(options.curveSmoothing, 2)),
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
