import type { VectorizeSettings } from '../types/svg.types';
import { reduceSvgStringColorsToCount, simplifyColors } from './colorUtils';
import { shouldPreserveIconPalette } from './iconModeSettings';
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

  if (shouldPreserveIconPalette(settings) && palette.length > 0) {
    // Snap first so light fills land on approved palette colors, then avoid
    // merging distinct palette entries (e.g. light pink ↔ near-white ≈ 52).
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
    mergePaths: false,
    // Compound paths often encode cutouts (for example, a dark badge ring
    // around a light center). The generic splitter cannot distinguish those
    // cutouts from disconnected same-color islands yet; splitting them fills
    // the hole and can cover an icon's background color.
    splitCompoundPaths: settings.traceMode !== 'icon',
  });

  return settings.traceMode === 'icon' ? regularizeLogoDetails(optimized) : optimized;
}
