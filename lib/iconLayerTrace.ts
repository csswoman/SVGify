import ImageTracer from 'imagetracerjs';
import { RGBColor, VectorizeSettings } from '@/types/svg.types';
import { rgbToString } from './colorUtils';
import { morphOpenAlpha } from './imageFilters';
import { nearestPaletteColor, type TracePaletteColor } from './paletteExtraction';
import { countPaths } from './simplifyPath';

const TRACE_PALETTE = [
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 255, g: 255, b: 255, a: 255 },
] as const;

const ICON_TRACE_MAX_DIMENSION = 720;

/** Downscale with box averaging so edges stay stable before tracing. */
export function downscaleForTrace(imageData: ImageData, maxDimension = ICON_TRACE_MAX_DIMENSION): ImageData {
  const { width, height, data } = imageData;
  if (Math.max(width, height) <= maxDimension) {
    return new ImageData(new Uint8ClampedArray(data), width, height);
  }

  const scale = maxDimension / Math.max(width, height);
  const newWidth = Math.max(1, Math.round(width * scale));
  const newHeight = Math.max(1, Math.round(height * scale));
  const out = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const sx0 = Math.floor((x * width) / newWidth);
      const sx1 = Math.max(sx0 + 1, Math.ceil(((x + 1) * width) / newWidth));
      const sy0 = Math.floor((y * height) / newHeight);
      const sy1 = Math.max(sy0 + 1, Math.ceil(((y + 1) * height) / newHeight));

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const idx = (sy * width + sx) * 4;
          if (data[idx + 3] < 16) continue;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          aSum += data[idx + 3];
          count++;
        }
      }

      const oi = (y * newWidth + x) * 4;
      if (count === 0) {
        out[oi + 3] = 0;
        continue;
      }

      out[oi] = Math.round(rSum / count);
      out[oi + 1] = Math.round(gSum / count);
      out[oi + 2] = Math.round(bSum / count);
      out[oi + 3] = Math.round(aSum / count);
    }
  }

  return new ImageData(out, newWidth, newHeight);
}

export function countPalettePixels(
  imageData: ImageData,
  color: RGBColor,
  palette: readonly RGBColor[]
): number {
  const { data } = imageData;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const snapped = nearestPaletteColor(
      { r: data[i], g: data[i + 1], b: data[i + 2] },
      palette
    );
    if (snapped.r === color.r && snapped.g === color.g && snapped.b === color.b) {
      count++;
    }
  }

  return count;
}

/** Build a white-on-transparent mask for one palette color. */
export function createColorMask(
  imageData: ImageData,
  color: RGBColor,
  palette: readonly RGBColor[]
): ImageData {
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    const snapped = nearestPaletteColor(
      { r: data[i], g: data[i + 1], b: data[i + 2] },
      palette
    );
    if (snapped.r === color.r && snapped.g === color.g && snapped.b === color.b) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }

  return new ImageData(out, width, height);
}

export function smoothColorMask(mask: ImageData, blurRadius: number): ImageData {
  let working = mask;
  // Only remove single-pixel speckles. Blurring binary masks before trace
  // creates chunky stair-stepped edges in the final SVG.
  const openRadius = blurRadius >= 4 ? 1 : 0;
  if (openRadius > 0) {
    working = morphOpenAlpha(working, openRadius);
  }

  const out = new ImageData(new Uint8ClampedArray(working.data), working.width, working.height);
  for (let i = 0; i < out.data.length; i += 4) {
    const visible = out.data[i + 3] >= 128;
    out.data[i] = visible ? 255 : 0;
    out.data[i + 1] = visible ? 255 : 0;
    out.data[i + 2] = visible ? 255 : 0;
    out.data[i + 3] = visible ? 255 : 0;
  }
  return out;
}

function extractPathTags(svg: string): string[] {
  return svg.match(/<path\b[^>]*>/g) ?? [];
}

function recolorLayerPaths(layerSvg: string, color: RGBColor): string[] {
  const fill = rgbToString(color);
  return extractPathTags(layerSvg).map((tag) =>
    tag
      .replace(/\s*stroke="[^"]*"/g, '')
      .replace(/\s*stroke-width="[^"]*"/g, '')
      .replace(/fill="rgb\([^"]*\)"/, `fill="${fill}"`)
  );
}

function buildTraceOptions(settings: VectorizeSettings, rasterSize: number) {
  const sizeFactor = Math.max(1, rasterSize / ICON_TRACE_MAX_DIMENSION);
  const blurBoost = settings.blurRadius * 0.08;
  return {
    numberofcolors: TRACE_PALETTE.length,
    pal: [...TRACE_PALETTE],
    colorquantcycles: 1,
    mincolorratio: 0,
    colorsampling: 0,
    // Lower ltres/qtres keep more curve detail (sharper silhouettes).
    ltres: Math.min(settings.ltres + blurBoost, 2),
    qtres: Math.min(settings.qtres + blurBoost, 1.8),
    pathomit: Math.min(10, Math.max(3, Math.round(settings.pathomit / (4 * sizeFactor)))),
    rightangleenhance: false,
    linefilter: false,
    strokewidth: 0,
    scale: settings.scale,
    roundcoords: Math.max(2, settings.roundcoords),
    viewbox: true,
    desc: false,
    blurradius: 0,
    blurdelta: 20,
  };
}

function buildCombinedTraceOptions(settings: VectorizeSettings, palette: TracePaletteColor[]) {
  return {
    numberofcolors: palette.length,
    pal: [...palette, { r: 255, g: 255, b: 255, a: 0 }],
    colorquantcycles: 1,
    mincolorratio: 0,
    colorsampling: 0,
    ltres: Math.min(settings.ltres + settings.blurRadius * 0.1, 2),
    qtres: Math.min(settings.qtres + settings.blurRadius * 0.08, 1.8),
    pathomit: Math.min(12, Math.max(4, Math.round(settings.pathomit / 3))),
    rightangleenhance: false,
    linefilter: false,
    strokewidth: 0,
    scale: settings.scale,
    roundcoords: Math.max(2, settings.roundcoords),
    viewbox: true,
    desc: false,
  };
}

export function traceIconCombined(
  iconRaster: ImageData,
  palette: RGBColor[],
  settings: VectorizeSettings
): string {
  const traceColors = palette.map((color) => ({ ...color, a: 255 as const }));
  return ImageTracer.imagedataToSVG(iconRaster, buildCombinedTraceOptions(settings, traceColors));
}

/**
 * Trace each palette color as its own smoothed binary layer. This avoids the
 * jagged shared boundaries that multi-color ImageTracer runs produce on icons.
 */
export function traceIconByColorLayers(
  iconRaster: ImageData,
  palette: RGBColor[],
  settings: VectorizeSettings
): string {
  const traceOptions = buildTraceOptions(settings, Math.max(iconRaster.width, iconRaster.height));
  const colorsByArea = [...palette].sort(
    (a, b) => countPalettePixels(iconRaster, b, palette) - countPalettePixels(iconRaster, a, palette)
  );

  const pathTags: string[] = [];

  for (const color of colorsByArea) {
    if (countPalettePixels(iconRaster, color, palette) === 0) continue;

    const mask = smoothColorMask(createColorMask(iconRaster, color, palette), settings.blurRadius);
    const layerSvg = ImageTracer.imagedataToSVG(mask, traceOptions);
    pathTags.push(...recolorLayerPaths(layerSvg, color));
  }

  const layeredSvg = `<svg viewBox="0 0 ${iconRaster.width} ${iconRaster.height}" xmlns="http://www.w3.org/2000/svg">${pathTags.join('')}</svg>`;

  if (countPaths(layeredSvg) >= 2) {
    return layeredSvg;
  }

  return traceIconCombined(iconRaster, palette, settings);
}
