import { describe, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { VECTORIZE_DEFAULTS, type VectorizeSettings } from '@/types/svg.types';
import { optimizeSvg, svgByteSize } from '@/lib/optimizeSvg';
import { applyBlur, buildIconSilhouette, upscaleImageData } from '@/lib/imageFilters';
import { downscaleForTrace, traceIconByColorLayers } from '@/lib/iconLayerTrace';
import {
  quantizeImageToIconPalette,
  removeSmallSvgPathsByBounds,
  snapSvgToIconPalette,
} from '@/lib/iconVectorization';
import { curveSmoothSvgPaths, simplifySvgPaths, countPaths } from '@/lib/simplifyPath';
import { compactSvgPaths } from '@/lib/svgPathCompaction';
import {
  applyAlphaMask,
  isDarkOutlineColor,
  isDropShadowColor,
  luminance,
  mergeSimilarPaletteColors,
  pickDarkOutlineColorFromImage,
  smoothQuantizedPalette,
  suggestPaletteFromImage,
  type TracePaletteColor,
} from '@/lib/paletteExtraction';
import { colorDistanceSq, extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';

class NodeImageData {
  readonly colorSpace: PredefinedColorSpace = 'srgb';
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

if (typeof ImageData === 'undefined') {
  Object.defineProperty(globalThis, 'ImageData', { value: NodeImageData });
}

const OUT_DIR = join(process.cwd(), 'out', 'diagnostics', process.env.DIAG_CASE ?? 'dog-line-art');
const TARGET_SVG_BYTES = 500 * 1024;
const OUTPUT_PREFIX = process.env.DIAG_PREFIX ?? 'before';

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface DiagnosticVectorizeResult {
  svg: string;
  curvedSvg: string;
  traceColors: TracePaletteColor[];
  pathCount: number;
  byteSize: number;
  polygonPathCount: number;
  curvePathCount: number;
  fillOrder: string[];
}

function imageDataFromFixture(): ImageData {
  const meta = JSON.parse(readFileSync(join(OUT_DIR, 'input.meta.json'), 'utf8')) as {
    width: number;
    height: number;
  };
  const bytes = readFileSync(join(OUT_DIR, 'input.rgba'));
  return new ImageData(new Uint8ClampedArray(bytes), meta.width, meta.height);
}

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

function removeTransparentPaths(svg: string): string {
  return svg.replace(/<path\b(?=[^>]*\bopacity="0(?:\.0+)?")[^>]*>/g, '');
}

function diagnosticVectorize(imageData: ImageData, settings: VectorizeSettings): DiagnosticVectorizeResult {
  const traceScale = Math.max(1, Math.min(2, Math.round(settings.traceScale)));
  const source = upscaleImageData(downscaleForTrace(imageData, Math.round(720 / traceScale)), traceScale);
  const targetColors = Math.max(2, Math.min(settings.numberofcolors, 24));
  const rawTraceColors = suggestPaletteFromImage(source, targetColors);
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
  const layered = traceIconByColorLayers(iconRaster, traceColors, settings);
  const withoutTransparent = removeTransparentPaths(layered);
  const snapped = snapSvgToIconPalette(withoutTransparent, traceColors);
  const minPathArea = Math.max(8, Math.round(settings.pathomit * 0.4));
  const shadowColors = traceColors.filter((color) => isDropShadowColor(color));
  const protectedFillColors = traceColors.filter(
    (color) => luminance(color) >= 96 || isDarkOutlineColor(color) || shadowColors.some((shadow) => colorDistanceSq(shadow, color) <= 36 * 36)
  );
  const withoutSpeckles = removeSmallSvgPathsByBounds(snapped, minPathArea, protectedFillColors);
  const compacted = compactSvgPaths(withoutSpeckles, 50);
  const curved = curveSmoothSvgPaths(
    compacted,
    Math.max(0, Math.min(2, settings.curveSmoothing)),
    settings.curveSmoothing >= 2 ? 0.55 : 0.35,
    Math.max(0, settings.roundcoords)
  );
  const seamStrokeWidth = Math.max(0, Math.min(settings.strokewidth, 2));
  const svg = optimizeWithinBudget(curved, Math.max(0, settings.roundcoords), seamStrokeWidth);
  const paths = svg.match(/<path\b[^>]*>/g) ?? [];
  const fillOrder = paths
    .map((path) => /fill="([^"]+)"/.exec(path)?.[1])
    .filter((fill): fill is string => Boolean(fill));

  return {
    svg,
    curvedSvg: curved,
    traceColors,
    pathCount: countPaths(svg),
    byteSize: svgByteSize(svg),
    polygonPathCount: paths.filter((path) => /d="[^"]*[LHV][^"]*"/i.test(path)).length,
    curvePathCount: paths.filter((path) => /d="[^"]*[CQST][^"]*"/i.test(path)).length,
    fillOrder,
  };
}

describe('vectorizer dog line-art diagnosis', () => {
  it('writes before SVG, render, and metrics for the current pipeline', async () => {
    mkdirSync(OUT_DIR, { recursive: true });
    const imageData = imageDataFromFixture();
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      numberofcolors: 18,
      blurRadius: 1,
      pathomit: 18,
      linePathOmit: envNumber('DIAG_LINE_PATHOMIT', VECTORIZE_DEFAULTS.linePathOmit),
      roundcoords: 1,
      blurDelta: envNumber('DIAG_BLUR_DELTA', VECTORIZE_DEFAULTS.blurDelta),
      traceScale: envNumber('DIAG_TRACE_SCALE', VECTORIZE_DEFAULTS.traceScale),
      strokewidth: envNumber('DIAG_STROKEWIDTH', VECTORIZE_DEFAULTS.strokewidth),
      fillOverlap: envNumber('DIAG_FILL_OVERLAP', VECTORIZE_DEFAULTS.fillOverlap),
      lineSmoothing: envNumber('DIAG_LINE_SMOOTHING', VECTORIZE_DEFAULTS.lineSmoothing),
      curveSmoothing: envNumber('DIAG_CURVE_SMOOTHING', VECTORIZE_DEFAULTS.curveSmoothing),
    };
    const result = diagnosticVectorize(imageData, settings);

    const metrics = {
      tracer: 'imagetracerjs via custom per-color mask pipeline',
      layeringMode: 'manual per-color layered SVG; effective stacked order by emitted path order',
      dimensions: { width: imageData.width, height: imageData.height },
      palette: result.traceColors.map((color) => rgbToHex(color)),
      extractedSvgPalette: extractPaletteFromSvgString(result.svg).map((color) => rgbToHex(color)),
      pathCount: result.pathCount,
      byteSize: result.byteSize,
      polygonPathCount: result.polygonPathCount,
      curvePathCount: result.curvePathCount,
      curvedQCount: (result.curvedSvg.match(/Q/g) ?? []).length,
      finalQCount: (result.svg.match(/Q/g) ?? []).length,
      strokeWidth: Math.max(0, Math.min(settings.strokewidth, 2)),
      traceScale: Math.max(1, Math.min(2, Math.round(settings.traceScale))),
      linePathOmit: Math.max(0, Math.min(settings.linePathOmit, 12)),
      firstFills: result.fillOrder.slice(0, 10),
      lastFills: result.fillOrder.slice(-10),
    };

    writeFileSync(join(OUT_DIR, `${OUTPUT_PREFIX}.svg`), result.svg, 'utf8');
    writeFileSync(join(OUT_DIR, `${OUTPUT_PREFIX}.curved.svg`), result.curvedSvg, 'utf8');
    writeFileSync(join(OUT_DIR, `${OUTPUT_PREFIX}.metrics.json`), JSON.stringify(metrics, null, 2), 'utf8');
    await sharp(Buffer.from(result.svg)).png().toFile(join(OUT_DIR, `${OUTPUT_PREFIX}.png`));

    const beforePng = join(OUT_DIR, 'before.png');
    const currentPng = join(OUT_DIR, `${OUTPUT_PREFIX}.png`);
    if (OUTPUT_PREFIX !== 'before' && existsSync(beforePng)) {
      await sharp(beforePng)
        .composite([{ input: currentPng, blend: 'difference' }])
        .png()
        .toFile(join(OUT_DIR, `${OUTPUT_PREFIX}.diff.png`));
    }
  });
});
