import { RGBColor } from '@/types/svg.types';
import { colorDistanceSq, rgbToString } from './colorUtils';

export type TracePaletteColor = RGBColor & { a: number };

export const ICON_BASE_PALETTE = [
  { name: 'black', color: { r: 18, g: 18, b: 20 } },
  { name: 'cream', color: { r: 255, g: 246, b: 214 } },
  { name: 'pink', color: { r: 244, g: 105, b: 164 } },
  { name: 'shadow', color: { r: 150, g: 150, b: 146 } },
] as const;

interface ColorBucket {
  r: number;
  g: number;
  b: number;
  count: number;
}

type ColorCandidate = RGBColor & { count: number };

const BASE_ICON_COLORS = ICON_BASE_PALETTE.map((entry) => entry.color);

export function luminance(color: RGBColor): number {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

function saturationRange(color: RGBColor): number {
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
}

function isSimilarToAny(color: RGBColor, colors: readonly RGBColor[], threshold = 32): boolean {
  const thresholdSq = threshold * threshold;
  return colors.some((candidate) => colorDistanceSq(color, candidate) <= thresholdSq);
}

function toRgb(color: Pick<TracePaletteColor, 'r' | 'g' | 'b'>): RGBColor {
  return { r: color.r, g: color.g, b: color.b };
}

export function isNearWhite(color: RGBColor, threshold = 244): boolean {
  const maxChannelDelta = 255 - threshold;
  return colorDistanceSq(color, { r: 255, g: 255, b: 255 }) <= maxChannelDelta * maxChannelDelta * 3;
}

/** Neutral gray used in soft drop shadows (not white, not saturated accents). */
export function isDropShadowColor(color: RGBColor): boolean {
  if (isNearWhite(color)) return false;
  const sat = saturationRange(color);
  const light = luminance(color);
  return sat <= 34 && light >= 48 && light < 245;
}

function isTrueBlackFill(color: RGBColor): boolean {
  return luminance(color) <= 42 && saturationRange(color) <= 24 && !isDropShadowColor(color);
}

function nearestAmong(color: RGBColor, palette: readonly RGBColor[]): RGBColor {
  let nearest: RGBColor = palette[0] ?? ICON_BASE_PALETTE[0].color;
  let best = colorDistanceSq(color, nearest);

  for (const entry of palette.slice(1)) {
    const distance = colorDistanceSq(color, entry);
    if (distance < best) {
      best = distance;
      nearest = entry;
    }
  }

  return { ...nearest };
}

function shadowPaletteEntries(palette: readonly RGBColor[]): RGBColor[] {
  return palette.filter(isDropShadowColor);
}

function blackPaletteEntries(palette: readonly RGBColor[]): RGBColor[] {
  return palette.filter(isTrueBlackFill);
}

export function removeNearWhitePixels(imageData: ImageData, threshold = 244): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 16) continue;
    if (isNearWhite({ r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] }, threshold)) {
      out.data[i + 3] = 0;
    }
  }

  return out;
}

export function mergeSimilarPaletteColors(
  palette: readonly RGBColor[],
  threshold = 28
): RGBColor[] {
  const merged: RGBColor[] = [];
  for (const color of palette) {
    if (!isSimilarToAny(color, merged, threshold)) {
      merged.push({ ...color });
    }
  }
  return merged;
}

function paletteColorIndex(color: RGBColor, palette: readonly RGBColor[]): number {
  let bestIndex = 0;
  let bestDistance = colorDistanceSq(color, palette[0] ?? ICON_BASE_PALETTE[0].color);

  for (let i = 1; i < palette.length; i++) {
    const distance = colorDistanceSq(color, palette[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Majority-filter a posterized icon so anti-aliased boundary pixels stop
 * flipping between neighbors and creating jagged traced edges.
 */
export function smoothQuantizedPalette(
  imageData: ImageData,
  palette: readonly RGBColor[],
  blurRadius = 1
): ImageData {
  if (palette.length === 0) return imageData;

  const { width, height } = imageData;
  const radius = 1 + Math.min(2, Math.floor(blurRadius / 2));
  const passes = 1 + Math.min(2, Math.floor(blurRadius / 3));
  let current = new Uint8ClampedArray(imageData.data);

  for (let pass = 0; pass < passes; pass++) {
    const next = new Uint8ClampedArray(current);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (current[idx + 3] < 16) continue;

        const currentRgb = {
          r: current[idx],
          g: current[idx + 1],
          b: current[idx + 2],
        };
        const votePalette = isDropShadowColor(currentRgb)
          ? shadowPaletteEntries(palette)
          : palette;
        const activePalette = votePalette.length > 0 ? votePalette : palette;

        const counts = new Map<number, number>();
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = (ny * width + nx) * 4;
            if (current[ni + 3] < 16) continue;

            const colorIndex = paletteColorIndex(
              { r: current[ni], g: current[ni + 1], b: current[ni + 2] },
              activePalette
            );
            counts.set(colorIndex, (counts.get(colorIndex) ?? 0) + 1);
          }
        }

        let bestIndex = paletteColorIndex(currentRgb, activePalette);
        let bestCount = 0;
        for (const [colorIndex, count] of counts) {
          if (count > bestCount) {
            bestCount = count;
            bestIndex = colorIndex;
          }
        }

        const snapped = activePalette[bestIndex] ?? activePalette[0];
        next[idx] = snapped.r;
        next[idx + 1] = snapped.g;
        next[idx + 2] = snapped.b;
      }
    }

    current = next;
  }

  return new ImageData(current, width, height);
}

export function hardenIconAlpha(imageData: ImageData, threshold = 160): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i + 3] = out.data[i + 3] >= threshold ? 255 : 0;
  }

  return out;
}

/**
 * Combine crisp quantized colors with a clean silhouette: RGB comes from
 * `color`, alpha comes from `mask`. This keeps region colors sharp (no blur
 * halos between regions) while the outer edge follows the smoothed mask.
 */
export function applyAlphaMask(color: ImageData, mask: ImageData): ImageData {
  const out = new ImageData(new Uint8ClampedArray(color.data), color.width, color.height);

  for (let i = 0; i < out.data.length; i += 4) {
    const rgb = { r: color.data[i], g: color.data[i + 1], b: color.data[i + 2] };
    const sourceAlpha = color.data[i + 3];
    const maskAlpha = mask.data[i + 3];

    // Keep soft gray shadows even when the binary silhouette threshold misses them.
    if (isDropShadowColor(rgb) && sourceAlpha >= 32) {
      out.data[i + 3] = sourceAlpha >= 56 ? 255 : 0;
    } else {
      out.data[i + 3] = maskAlpha;
    }
  }

  return out;
}

export function nearestPaletteColor(
  color: RGBColor,
  palette: readonly RGBColor[] = BASE_ICON_COLORS
): RGBColor {
  const shadows = shadowPaletteEntries(palette);

  if (isDropShadowColor(color) && shadows.length > 0) {
    return nearestAmong(color, shadows);
  }

  const sat = saturationRange(color);
  const light = luminance(color);
  if (sat <= 34 && light >= 48 && light < 140 && shadows.length > 0) {
    return nearestAmong(color, shadows);
  }

  if (isTrueBlackFill(color)) {
    const blacks = blackPaletteEntries(palette);
    if (blacks.length > 0) return nearestAmong(color, blacks);
  }

  return nearestAmong(color, palette);
}

export function quantizeImageToPalette(
  imageData: ImageData,
  palette: readonly RGBColor[] = BASE_ICON_COLORS
): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 16) continue;
    const snapped = nearestPaletteColor(
      {
        r: out.data[i],
        g: out.data[i + 1],
        b: out.data[i + 2],
      },
      palette
    );
    out.data[i] = snapped.r;
    out.data[i + 1] = snapped.g;
    out.data[i + 2] = snapped.b;
  }

  return out;
}

export function snapSvgToPalette(
  svg: string,
  palette: readonly RGBColor[] = BASE_ICON_COLORS
): string {
  return svg.replace(
    /(fill|stroke)="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g,
    (_full, attr: string, r: string, g: string, b: string) => {
      const snapped = nearestPaletteColor({ r: Number(r), g: Number(g), b: Number(b) }, palette);
      return `${attr}="${rgbToString(snapped)}"`;
    }
  );
}

function countOpaqueNearWhitePixels(imageData: ImageData, threshold = 244): number {
  let count = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] < 16) continue;
    if (isNearWhite({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] }, threshold)) {
      count++;
    }
  }
  return count;
}

function totalOpaquePixels(imageData: ImageData): number {
  let count = 0;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] >= 16) count++;
  }
  return count;
}

function collectVisibleColorBuckets(imageData: ImageData): ColorCandidate[] {
  const buckets = new Map<number, ColorBucket>();

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] < 16) continue;
    const color = { r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] };
    if (isNearWhite(color)) continue;

    const rq = color.r >> 3;
    const gq = color.g >> 3;
    const bq = color.b >> 3;
    const key = (rq << 10) | (gq << 5) | bq;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += color.r;
      bucket.g += color.g;
      bucket.b += color.b;
      bucket.count++;
    } else {
      buckets.set(key, { ...color, count: 1 });
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function suggestPaletteFromImage(imageData: ImageData, maxColors: number): TracePaletteColor[] {
  const limit = Math.max(2, Math.min(24, Math.floor(maxColors)));
  const candidates = collectVisibleColorBuckets(imageData);
  const selected: RGBColor[] = [];
  const defaultThreshold = limit >= 18 ? 10 : limit >= 12 ? 18 : 32;
  const addColor = (color: RGBColor, threshold = defaultThreshold) => {
    if (selected.length >= limit) return;
    if (!isSimilarToAny(color, selected, threshold)) selected.push({ ...color });
  };

  const totalOpaque = totalOpaquePixels(imageData);
  const minProminentCount = Math.max(3, Math.ceil(totalOpaque * (limit >= 18 ? 0.0015 : 0.003)));
  const prominent = candidates.filter((color) => color.count >= minProminentCount);
  const source = prominent.length >= Math.min(limit, 4) ? prominent : candidates;

  // Enclosed white fills (face, belly, highlights) survive edge flood-fill — keep them in the palette.
  const nearWhitePixels = countOpaqueNearWhitePixels(imageData);
  if (nearWhitePixels > 0 && nearWhitePixels / Math.max(1, totalOpaque) >= 0.02) {
    addColor({ r: 255, g: 255, b: 255 });
  }

  const shadowCandidates = source
    .filter((color) => isDropShadowColor(color))
    .sort((a, b) => b.count - a.count);
  if (shadowCandidates[0]) {
    addColor(toRgb(shadowCandidates[0]));
  }

  const blackCandidates = source
    .filter((color) => isTrueBlackFill(color))
    .sort((a, b) => b.count - a.count);
  if (blackCandidates[0]) {
    addColor(toRgb(blackCandidates[0]), 14);
  }

  for (const color of source) {
    if (selected.length >= limit) break;
    const isAccent = saturationRange(color) >= 36 && luminance(color) > 45;
    const isCream = colorDistanceSq(color, ICON_BASE_PALETTE[1].color) <= 56 * 56;
    if (isAccent && !isCream) addColor(toRgb(color));
  }

  const largeDarkAccentCount = Math.max(minProminentCount * 3, Math.ceil(totalOpaque * 0.01));
  for (const color of source) {
    if (selected.length >= limit) break;
    const isDarkAccent = saturationRange(color) >= 30 && luminance(color) <= 55;
    if (isDarkAccent && !isTrueBlackFill(color) && color.count >= largeDarkAccentCount) {
      addColor(toRgb(color), 14);
    }
  }

  if (
    shadowCandidates.length === 0 &&
    source.some((color) => {
      const lightness = luminance(color);
      return saturationRange(color) <= 28 && lightness > 70 && lightness < 220;
    })
  ) {
    const neutral = source.find((color) => {
      const lightness = luminance(color);
      return saturationRange(color) <= 28 && lightness > 70 && lightness < 220;
    });
    if (neutral) addColor(toRgb(neutral));
  }

  for (const color of source) {
    if (selected.length >= limit) break;
    const isDarkAccent = saturationRange(color) >= 30 && luminance(color) <= 55;
    addColor(toRgb(color), isDarkAccent ? 14 : defaultThreshold);
  }

  if (selected.length < limit && limit >= 12) {
    for (const color of source) {
      if (selected.length >= limit) break;
      const isDarkAccent = saturationRange(color) >= 30 && luminance(color) <= 55;
      addColor(toRgb(color), isDarkAccent ? 10 : 4);
    }
  }

  if (selected.length === 0) addColor(ICON_BASE_PALETTE[0].color);

  return selected.map((color) => ({ ...color, a: 255 }));
}

export function iconTracePalette(): TracePaletteColor[] {
  return ICON_BASE_PALETTE.map((entry) => ({ ...entry.color, a: 255 }));
}
