import ImageTracer from 'imagetracerjs';
import { RGBColor, VectorizeSettings } from '@/types/svg.types';
import { rgbToString } from './colorUtils';
import { morphCloseAlpha, morphDilateAlpha, morphOpenAlpha } from './imageFilters';
import { luminance, nearestPaletteColor, type TracePaletteColor } from './paletteExtraction';
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

interface PaletteClassMap {
  indexes: Int16Array;
  counts: number[];
}

function buildPaletteClassMap(imageData: ImageData, palette: readonly RGBColor[]): PaletteClassMap {
  const pixels = imageData.width * imageData.height;
  const indexes = new Int16Array(pixels);
  const counts = new Array<number>(palette.length).fill(0);
  indexes.fill(-1);

  for (let pixel = 0; pixel < pixels; pixel++) {
    const i = pixel * 4;
    if (imageData.data[i + 3] < 16) continue;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let paletteIndex = 0; paletteIndex < palette.length; paletteIndex++) {
      const color = palette[paletteIndex];
      const dr = imageData.data[i] - color.r;
      const dg = imageData.data[i + 1] - color.g;
      const db = imageData.data[i + 2] - color.b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = paletteIndex;
      }
    }

    indexes[pixel] = bestIndex;
    counts[bestIndex]++;
  }

  return { indexes, counts };
}

function createMaskFromClassMap(imageData: ImageData, classMap: PaletteClassMap, colorIndex: number): ImageData {
  const { width, height } = imageData;
  const out = new Uint8ClampedArray(width * height * 4);

  for (let pixel = 0; pixel < classMap.indexes.length; pixel++) {
    if (classMap.indexes[pixel] !== colorIndex) continue;
    const i = pixel * 4;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = 255;
  }

  return new ImageData(out, width, height);
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

/** Pixels of `color` with at least one transparent neighbor (outer edge). */
export function countColorOuterEdgePixels(
  imageData: ImageData,
  color: RGBColor,
  palette: readonly RGBColor[]
): number {
  const { width, height, data } = imageData;
  let count = 0;

  const matches = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 16) return false;
    const snapped = nearestPaletteColor({ r: data[i], g: data[i + 1], b: data[i + 2] }, palette);
    return snapped.r === color.r && snapped.g === color.g && snapped.b === color.b;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!matches(x, y)) continue;
      const touchesTransparent =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        (y > 0 && data[((y - 1) * width + x) * 4 + 3] < 16) ||
        (y < height - 1 && data[((y + 1) * width + x) * 4 + 3] < 16) ||
        (x > 0 && data[(y * width + (x - 1)) * 4 + 3] < 16) ||
        (x < width - 1 && data[(y * width + (x + 1)) * 4 + 3] < 16);
      if (touchesTransparent) count++;
    }
  }

  return count;
}

/** The palette color that forms the visible outer shell (most pixels on the edge). */
export function pickOuterBorderColor(
  imageData: ImageData,
  palette: readonly RGBColor[]
): RGBColor | null {
  let best: RGBColor | null = null;
  let bestEdge = 0;

  for (const color of palette) {
    const edge = countColorOuterEdgePixels(imageData, color, palette);
    if (edge > bestEdge) {
      bestEdge = edge;
      best = color;
    }
  }

  return bestEdge > 0 ? best : null;
}

function prepareLayerMask(
  mask: ImageData,
  color: RGBColor,
  settings: VectorizeSettings
): ImageData {
  const isLine = isLikelyLineColor(color);
  if (isLine) {
    const closeRadius = Math.max(0, Math.min(2, Math.round(settings.lineSmoothing)));
    const closed = closeRadius > 0 ? morphCloseAlpha(mask, closeRadius) : mask;
    const reconnected = closeRadius > 0 ? morphDilateAlpha(closed, 1) : closed;
    return smoothColorMask(reconnected, settings.blurRadius);
  }

  const overlap = Math.max(0, Math.min(2, settings.fillOverlap));
  const expanded = overlap > 0 ? morphDilateAlpha(mask, overlap) : mask;
  return smoothColorMask(expanded, settings.blurRadius);
}

export function smoothColorMask(mask: ImageData, blurRadius: number, extraOpenPasses = 0): ImageData {
  let working = mask;
  // Close tiny transparent pinholes before tracing so fills stay solid.
  if (blurRadius >= 1) {
    working = morphCloseAlpha(working, 1);
  }

  // Remove single-pixel speckles without blurring traced edges.
  const openPasses = (blurRadius >= 4 ? 1 : 0) + Math.max(0, Math.min(2, extraOpenPasses));
  for (let pass = 0; pass < openPasses; pass++) {
    working = morphOpenAlpha(working, 1);
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

function isLikelyLineColor(color: RGBColor): boolean {
  const sat = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
  const light = luminance(color);
  return light <= 42 || (light >= 30 && light <= 118 && sat >= 18);
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

function buildTraceOptions(settings: VectorizeSettings, rasterSize: number, isLineLayer: boolean) {
  const sizeFactor = Math.max(1, rasterSize / ICON_TRACE_MAX_DIMENSION);
  const blurBoost = settings.blurRadius * 0.08;
  const basePathOmit = isLineLayer ? settings.linePathOmit : settings.pathomit;
  const maxPathOmit = isLineLayer ? 4 : 12;
  const minPathOmit = isLineLayer ? 0 : 3;
  return {
    numberofcolors: TRACE_PALETTE.length,
    pal: [...TRACE_PALETTE],
    colorquantcycles: 1,
    mincolorratio: 0,
    colorsampling: 0,
    // Low line tolerance forces ImageTracer to prefer quadratic splines over
    // long jagged polygon runs; qtres then controls how much the spline may smooth.
    ltres: Math.max(0.05, Math.min(settings.ltres * 0.2 + blurBoost, 0.45)),
    qtres: Math.max(0.8, Math.min(settings.qtres + blurBoost, 2.2)),
    pathomit: Math.min(maxPathOmit, Math.max(minPathOmit, Math.round(basePathOmit / (4 * sizeFactor)))),
    rightangleenhance: false,
    linefilter: true,
    strokewidth: 0,
    scale: settings.scale,
    roundcoords: Math.max(0, settings.roundcoords),
    viewbox: true,
    desc: false,
    blurradius: Math.min(3, Math.max(0, settings.blurRadius)),
    blurdelta: Math.max(1, Math.min(64, settings.blurDelta)),
  };
}

function buildCombinedTraceOptions(settings: VectorizeSettings, palette: TracePaletteColor[]) {
  return {
    numberofcolors: palette.length,
    pal: [...palette, { r: 255, g: 255, b: 255, a: 0 }],
    colorquantcycles: 1,
    mincolorratio: 0,
    colorsampling: 0,
    ltres: Math.max(0.05, Math.min(settings.ltres * 0.2 + settings.blurRadius * 0.1, 0.45)),
    qtres: Math.max(0.8, Math.min(settings.qtres + settings.blurRadius * 0.08, 2.2)),
    pathomit: Math.min(12, Math.max(4, Math.round(settings.pathomit / 3))),
    rightangleenhance: false,
    linefilter: true,
    strokewidth: 0,
    scale: settings.scale,
    roundcoords: Math.max(0, settings.roundcoords),
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
 * Trace each palette color as its own smoothed binary layer.
 */
export function traceIconByColorLayers(
  iconRaster: ImageData,
  palette: RGBColor[],
  settings: VectorizeSettings
): string {
  const classMap = buildPaletteClassMap(iconRaster, palette);
  const colorIndexesByArea = palette
    .map((color, index) => ({
      color,
      index,
      count: classMap.counts[index] ?? 0,
      isLine: isLikelyLineColor(color),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => {
      if (a.isLine !== b.isLine) return a.isLine ? 1 : -1;
      return b.count - a.count;
    });

  const pathTags: string[] = [];

  for (const { color, index } of colorIndexesByArea) {
    const isLine = isLikelyLineColor(color);
    const traceOptions = buildTraceOptions(settings, Math.max(iconRaster.width, iconRaster.height), isLine);
    const sourceMask = createMaskFromClassMap(iconRaster, classMap, index);
    const mask = prepareLayerMask(sourceMask, color, settings);
    const layerSvg = ImageTracer.imagedataToSVG(mask, traceOptions);
    pathTags.push(...recolorLayerPaths(layerSvg, color));
  }

  const layeredSvg = `<svg viewBox="0 0 ${iconRaster.width} ${iconRaster.height}" xmlns="http://www.w3.org/2000/svg">${pathTags.join('')}</svg>`;

  if (countPaths(layeredSvg) >= 2) {
    return layeredSvg;
  }

  return traceIconCombined(iconRaster, palette, settings);
}
