import type { RGBColor, VectorizeSettings } from '../types/svg.types';

/** Defaults applied when switching to Icon mode in the inspector. */
export const ICON_MODE_SETTINGS = {
  colorPrecision: 3,
  numberofcolors: 8,
  // Preserve small logo details instead of dropping thin teeth or marks.
  filterSpeckle: 4,
  pathomit: 4,
  // Keep intentional corners and short straight runs. The old 95/10/3/75
  // profile over-fit splines and visibly bowed flat logo geometry.
  cornerThreshold: 60,
  pathPrecision: 2,
  roundcoords: 2,
  // Keep below ~52 so light pink fills do not merge into near-white/lavender.
  paletteMergeThreshold: 36,
  bilateralRadius: 1,
  blurRadius: 1,
  layerDifference: 12,
  // Moderate subdivision keeps large rounded forms smooth; thin bars are
  // regularized after tracing, so they no longer need globally harsh fitting.
  lengthThreshold: 5,
  maxIterations: 2,
  spliceThreshold: 45,
  fillOverlap: 1,
  lineSmoothing: 1,
  curveSmoothing: 1,
} as const;

export function resolveTraceSmallCircle(traceMode: VectorizeSettings['traceMode']): number | undefined {
  return traceMode === 'icon' ? 16 : undefined;
}

/** Low-resolution icons need one true resampling pass before polygon tracing. */
export function resolveIconPreprocessingScale(
  requestedScale: number,
  width: number,
  height: number
): number {
  const requested = Math.max(1, Math.min(2, Math.round(requestedScale)));
  if (requested >= 2) return 2;
  return Math.max(width, height) <= 512 ? 2 : 1;
}

/**
 * Low-resolution flat icons need a small topology cleanup even when the user
 * does not request visual blur. This removes compression notches without
 * changing the user-selected palette.
 */
export function resolveIconPaletteSmoothing(
  requestedRadius: number,
  width: number,
  height: number
): number {
  const requested = Math.max(0, Math.min(3, Math.round(requestedRadius)));
  return Math.max(width, height) <= 1024 ? Math.max(2, requested) : requested;
}

/** Keep higher color-count settings from immediately merging their extra shades. */
export function resolvePaletteMergeCeiling(colorCount: number): number {
  if (colorCount >= 128) return 4;
  if (colorCount >= 64) return 12;
  if (colorCount >= 32) return 24;
  return 44;
}

/** Mildly scale cleanup without erasing the transition shades that keep large artwork smooth. */
export function resolveRasterSpeckleArea(
  filterSpeckle: number,
  width: number,
  height: number
): number {
  const base = Math.max(1, Math.min(40, Math.round(filterSpeckle)));
  const sizeScale = Math.min(1.25, Math.max(1, Math.sqrt(Math.max(1, width * height)) / 512));
  return Math.max(2, Math.min(12, Math.round(base * sizeScale)));
}

export function shouldPreserveTracePalette(
  settings: Pick<VectorizeSettings, 'customPalette'>
): boolean {
  return (settings.customPalette?.length ?? 0) > 0;
}

/**
 * When the raster is already posterized to the selected palette, VTracer must
 * not re-quantize it with a lower precision. Otherwise Standard can discard
 * requested shades even when the color-count control is raised.
 */
export function resolveTraceColorPrecision(
  settings: Pick<VectorizeSettings, 'traceMode' | 'colorPrecision' | 'customPalette'>
): number {
  const base = Math.max(1, Math.min(8, Math.round(settings.colorPrecision)));
  if (shouldPreserveTracePalette(settings)) return 8;
  return base;
}

export function paletteForTrace(
  settings: Pick<VectorizeSettings, 'customPalette' | 'numberofcolors'>
): RGBColor[] {
  return (settings.customPalette ?? []).slice(
    0,
    Math.max(1, Math.min(256, settings.numberofcolors))
  );
}
