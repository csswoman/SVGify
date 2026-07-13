import type { VectorizeSettings } from '../types/svg.types';
import { reduceSvgStringColorsToCount, simplifyColors } from './colorUtils';
import { shouldPreserveTracePalette } from './iconModeSettings';
import { snapSvgToPalette } from './paletteExtraction';
import { optimizeSvg } from './optimizeSvg';
import { regularizeLogoDetails } from './regularizeLogoDetails';

/**
 * Post-process a raw VTracer SVG: merge near-duplicates, optionally snap to the
 * icon palette, cap color count, and optimize.
 */
export function finalizeTracedSvg(rawSvg: string, settings: VectorizeSettings): string {
  const mergeThreshold = Math.max(0, Math.min(128, Math.round(settings.paletteMergeThreshold)));
  const colorCap = Math.max(2, Math.min(256, Math.round(settings.numberofcolors)));
  const palette = settings.customPalette ?? [];

  let svg: string;

  if (shouldPreserveTracePalette(settings) && palette.length > 0) {
    // Both modes are pre-quantized to the palette. Snap the small numeric drift
    // produced by VTracer back to those approved colors instead of merging
    // distinct entries after the trace.
    svg = snapSvgToPalette(rawSvg, palette);
    svg = reduceSvgStringColorsToCount(svg, Math.max(colorCap, palette.length));
  } else {
    svg = simplifyColors(rawSvg, mergeThreshold);
    svg = reduceSvgStringColorsToCount(svg, colorCap);
  }

  const optimized = optimizeSvg(svg, {
    removeStroke: true,
    // Adjacent flat-color regions otherwise expose antialiased hairline gaps,
    // making details such as teeth look detached from the face.
    sealSeams: settings.traceMode === 'icon' ? 0.5 : undefined,
    dropDefaultOpacity: true,
    coordDecimals: Math.max(0, Math.min(8, Math.round(settings.pathPrecision))),
    // Standard can produce hundreds of adjacent fragments at higher color
    // counts. SVGO safely joins only compatible neighboring paths without
    // moving them across other paint layers, reducing tags and file size.
    mergePaths: settings.traceMode === 'standard',
    // Compound paths encode both disconnected islands and transparent cutouts.
    // Splitting them cannot preserve that distinction: holes between legs or
    // inside layered artwork become filled shapes, and lower stacked colors
    // can show through as stray marks. Keep their topology in both modes.
    splitCompoundPaths: false,
  });

  return settings.traceMode === 'icon' ? regularizeLogoDetails(optimized) : optimized;
}
