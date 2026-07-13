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

export function shouldPreserveIconPalette(
  settings: Pick<VectorizeSettings, 'traceMode' | 'customPalette'>
): boolean {
  return settings.traceMode === 'icon' && (settings.customPalette?.length ?? 0) > 0;
}

/**
 * When the raster is already posterized to a flat icon palette, VTracer must
 * not re-quantize with a coarse colorPrecision (2 collapses light fills).
 */
export function resolveTraceColorPrecision(
  settings: Pick<VectorizeSettings, 'traceMode' | 'colorPrecision' | 'customPalette'>
): number {
  const base = Math.max(1, Math.min(8, Math.round(settings.colorPrecision)));
  if (shouldPreserveIconPalette(settings)) return 8;
  return base;
}

export function iconPaletteForTrace(
  settings: Pick<VectorizeSettings, 'customPalette' | 'numberofcolors'>
): RGBColor[] {
  return (settings.customPalette ?? []).slice(
    0,
    Math.max(1, Math.min(16, settings.numberofcolors))
  );
}
