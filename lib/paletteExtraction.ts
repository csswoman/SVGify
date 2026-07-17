import { RGBColor } from '@/types/svg.types';
import { colorDistanceSq, parseRgbString, rgbToString } from './colorUtils';

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
  edgeCount: number;
}

type ColorCandidate = RGBColor & { count: number; edgeCount: number };

interface SourceColorBucket {
  interiorCount: number;
  exactCounts: Map<number, number>;
}

type SourceColorAnchor = RGBColor & {
  interiorCount: number;
  representativeCount: number;
};

// Colors that only exist in antialiased transparency must not become palette
// entries when the SVG output later hardens those pixels to opaque shapes.
const PALETTE_SAMPLE_ALPHA = 224;

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

function exactColorKey(color: RGBColor): number {
  return (color.r << 16) | (color.g << 8) | color.b;
}

function colorFromExactKey(key: number): RGBColor {
  return {
    r: (key >> 16) & 255,
    g: (key >> 8) & 255,
    b: key & 255,
  };
}

function quantizedColorKey(color: RGBColor): number {
  return ((color.r >> 3) << 10) | ((color.g >> 3) << 5) | (color.b >> 3);
}

export function isNearWhite(color: RGBColor, threshold = 244): boolean {
  const maxChannelDelta = 255 - threshold;
  return colorDistanceSq(color, { r: 255, g: 255, b: 255 }) <= maxChannelDelta * maxChannelDelta * 3;
}

/** Light neutral artwork (white text/fills affected by antialiasing or capture). */
export function isLightNeutralFill(color: RGBColor): boolean {
  return saturationRange(color) <= 28 && luminance(color) >= 210;
}

/** Neutral gray used in soft drop shadows (not white, not saturated accents). */
export function isDropShadowColor(color: RGBColor): boolean {
  if (isNearWhite(color) || isLightNeutralFill(color)) return false;
  const sat = saturationRange(color);
  const light = luminance(color);
  return sat <= 34 && light >= 48 && light < 245;
}

function isTrueBlackFill(color: RGBColor): boolean {
  return luminance(color) <= 42 && saturationRange(color) <= 24 && !isDropShadowColor(color);
}

function isDarkLineColor(color: RGBColor): boolean {
  return !isNearWhite(color) && !isDropShadowColor(color) && luminance(color) <= 65 && saturationRange(color) >= 12;
}

export function isDarkOutlineColor(color: RGBColor): boolean {
  if (isNearWhite(color) || isDropShadowColor(color) || isTrueBlackFill(color)) return false;
  const light = luminance(color);
  return light >= 30 && light <= 118 && saturationRange(color) >= 18;
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

function outlinePaletteEntries(palette: readonly RGBColor[]): RGBColor[] {
  return palette.filter((color) => isDarkOutlineColor(color) || isDarkLineColor(color));
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
    const categoryThreshold = isDarkOutlineColor(color) && threshold >= 14 ? Math.max(threshold, 48) : threshold;
    if (!isSimilarToAny(color, merged, categoryThreshold)) {
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

function isNeutralMidtone(color: RGBColor): boolean {
  const light = luminance(color);
  return saturationRange(color) <= 18 && light >= 32 && light < 210;
}

/**
 * Remove a neutral palette color only when it forms a thin transition between
 * two other colors. Broad neutral regions (such as a gray mountain) and their
 * outer boundary remain untouched because they have local area or meet only
 * one neighboring color.
 */
function cleanThinNeutralTransitions(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly RGBColor[]
): Uint8ClampedArray {
  const neutralIndexes = new Set(
    palette
      .map((color, index) => ({ color, index }))
      .filter(({ color }) => isNeutralMidtone(color))
      .map(({ index }) => index)
  );
  if (neutralIndexes.size === 0) return pixels;

  const out = new Uint8ClampedArray(pixels);
  const radius = 2;
  const classes = new Int16Array(width * height);
  classes.fill(-1);

  for (let pixel = 0; pixel < classes.length; pixel++) {
    const index = pixel * 4;
    if (pixels[index + 3] < 16) continue;
    classes[pixel] = paletteColorIndex(
      { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] },
      palette
    );
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const pixelIndex = pixel * 4;
      const currentIndex = classes[pixel];
      if (!neutralIndexes.has(currentIndex)) continue;

      let visibleCount = 0;
      let sameColorCount = 0;
      const replacementCounts = new Map<number, number>();

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighborIndex = classes[ny * width + nx];
          if (neighborIndex < 0) continue;
          visibleCount++;
          if (neighborIndex === currentIndex) {
            sameColorCount++;
          } else if (!neutralIndexes.has(neighborIndex)) {
            replacementCounts.set(
              neighborIndex,
              (replacementCounts.get(neighborIndex) ?? 0) + 1
            );
          }
        }
      }

      if (
        replacementCounts.size < 2 ||
        sameColorCount / Math.max(1, visibleCount) >= 0.5
      ) {
        continue;
      }

      let replacementIndex = -1;
      let replacementCount = 0;
      for (const [candidateIndex, count] of replacementCounts) {
        if (count > replacementCount) {
          replacementIndex = candidateIndex;
          replacementCount = count;
        }
      }
      const replacement = palette[replacementIndex];
      if (!replacement) continue;
      out[pixelIndex] = replacement.r;
      out[pixelIndex + 1] = replacement.g;
      out[pixelIndex + 2] = replacement.b;
    }
  }

  return out;
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
          : isDarkOutlineColor(currentRgb) || isDarkLineColor(currentRgb)
            ? outlinePaletteEntries(palette)
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

  return new ImageData(
    new Uint8ClampedArray(
      cleanThinNeutralTransitions(current, width, height, palette)
    ),
    width,
    height
  );
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
  const outlines = outlinePaletteEntries(palette);

  if (isDropShadowColor(color) && shadows.length > 0) {
    return nearestAmong(color, shadows);
  }

  if ((isDarkOutlineColor(color) || isDarkLineColor(color)) && outlines.length > 0) {
    return nearestAmong(color, outlines);
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

function scaledColorDirectionSimilarity(a: RGBColor, b: RGBColor): number {
  const dot = a.r * b.r + a.g * b.g + a.b * b.b;
  const aStrength = a.r * a.r + a.g * a.g + a.b * a.b;
  const bStrength = b.r * b.r + b.g * b.g + b.b * b.b;
  if (aStrength < 1 || bStrength < 1) return 0;
  return (dot * dot) / (aStrength * bStrength);
}

function accentPreference(color: RGBColor): number {
  const sat = saturationRange(color);
  const light = luminance(color);
  const midLightBonus = 1 - Math.min(1, Math.abs(light - 150) / 150);
  return sat * (0.65 + midLightBonus * 0.35);
}

/**
 * JPEG/WebP antialiasing of a flat accent over a dark matte invents a second,
 * lighter shade of the same hue. Keeping both splits solid shapes (sun, star)
 * into half-and-half fills so only one side can regularize as a full primitive.
 * Collapse accents that share nearly the same RGB direction AND sit close in
 * RGB space into the stronger logo color. Distinct logo fills that merely point
 * in a similar hue direction (for example light pink vs medium magenta) must
 * stay separate.
 */
export function collapseNearDuplicateAccents(palette: readonly RGBColor[]): RGBColor[] {
  // Twin JPEG shades of one accent land well under ~50ΔE-ish RGB units; distinct
  // logo fills of the same family (EN light pink vs letter magenta) sit farther.
  const maxTwinDistanceSq = 52 * 52;
  const result: RGBColor[] = [];
  for (const color of palette) {
    const sat = saturationRange(color);
    const light = luminance(color);
    if (sat < 40 || light < 80) {
      result.push({ ...color });
      continue;
    }

    let absorbed = false;
    for (let index = 0; index < result.length; index++) {
      const existing = result[index];
      if (saturationRange(existing) < 40 || luminance(existing) < 80) continue;
      if (colorDistanceSq(color, existing) > maxTwinDistanceSq) continue;
      if (scaledColorDirectionSimilarity(color, existing) < 0.97) continue;
      if (accentPreference(color) > accentPreference(existing)) {
        result[index] = { ...color };
      }
      absorbed = true;
      break;
    }
    if (!absorbed) result.push({ ...color });
  }
  return result;
}

/**
 * Repaint palette colors created by an opaque black matte. A remnant is dark,
 * mostly touches transparency, occupies only a small part of the artwork, and
 * points in nearly the same RGB direction as a much brighter accent. Broad
 * dark artwork (for example a navy mountain) fails the edge-dominance test.
 */
export function recoverOpaqueMattePaletteFringes(
  imageData: ImageData,
  palette: readonly RGBColor[]
): ImageData {
  if (palette.length < 2) return imageData;

  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const classes = new Int16Array(pixelCount);
  classes.fill(-1);
  const counts = new Uint32Array(palette.length);
  const edgeCounts = new Uint32Array(palette.length);
  let visibleCount = 0;

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const index = pixel * 4;
    if (data[index + 3] < 16) continue;
    const paletteIndex = paletteColorIndex(
      { r: data[index], g: data[index + 1], b: data[index + 2] },
      palette
    );
    classes[pixel] = paletteIndex;
    counts[paletteIndex]++;
    visibleCount++;
  }

  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const paletteIndex = classes[pixel];
    if (paletteIndex < 0) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (
      x === 0 ||
      x === width - 1 ||
      y === 0 ||
      y === height - 1 ||
      classes[pixel - 1] < 0 ||
      classes[pixel + 1] < 0 ||
      classes[pixel - width] < 0 ||
      classes[pixel + width] < 0
    ) {
      edgeCounts[paletteIndex]++;
    }
  }

  const replacements = new Int16Array(palette.length);
  replacements.fill(-1);

  for (let darkIndex = 0; darkIndex < palette.length; darkIndex++) {
    const dark = palette[darkIndex];
    const count = counts[darkIndex];
    if (count === 0) continue;
    const darkLightness = luminance(dark);
    // A yellow/accent edge composited over a black matte collapses into a dark,
    // hue-aligned shade. On heavily compressed or low-resolution uploads that
    // fringe widens into a thick band, so its share of edge pixels drops and its
    // total footprint grows. The tight hue-direction gate below (0.985 vs a
    // bright, saturated accent) is the real safeguard, so keep only loose
    // pre-filters here: reject clearly interior fills (little transparency
    // contact) and colors that dominate the artwork.
    if (
      darkLightness > 55 ||
      edgeCounts[darkIndex] / count < 0.28 ||
      count / Math.max(1, visibleCount) > 0.24
    ) continue;

    // A dark accent fringe (e.g. yellow over black → olive) points ~within 8°
    // of its bright source in raw RGB, but the source's blue channel keeps the
    // squared-cosine below the old 0.985 cut. Neutral dark artwork (navy ≈ 0.69
    // vs yellow) stays far below this bar.
    let bestTarget = -1;
    let bestSimilarity = 0.975;
    for (let targetIndex = 0; targetIndex < palette.length; targetIndex++) {
      if (targetIndex === darkIndex) continue;
      const target = palette[targetIndex];
      if (
        luminance(target) < Math.max(100, darkLightness * 3) ||
        saturationRange(target) < 40
      ) continue;

      const similarity = scaledColorDirectionSimilarity(dark, target);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestTarget = targetIndex;
      }
    }
    replacements[darkIndex] = bestTarget;
  }

  let hasReplacement = false;
  for (const replacement of replacements) {
    if (replacement >= 0) {
      hasReplacement = true;
      break;
    }
  }
  if (!hasReplacement) return imageData;

  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const replacement = classes[pixel] >= 0 ? replacements[classes[pixel]] : -1;
    if (replacement < 0) continue;
    const color = palette[replacement];
    const index = pixel * 4;
    out.data[index] = color.r;
    out.data[index + 1] = color.g;
    out.data[index + 2] = color.b;
  }
  return out;
}

/**
 * Remove small islands created by palette quantization without inventing a
 * replacement color. A tiny component is repainted only when it touches an
 * existing opaque neighboring color; isolated artwork on transparency (stars,
 * dots, detached accents) is preserved.
 */
export function absorbSmallPaletteComponents(
  imageData: ImageData,
  minArea: number
): ImageData {
  const threshold = Math.max(1, Math.floor(minArea));
  if (threshold <= 1) return imageData;

  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const out = new Uint8ClampedArray(data);
  const colorKeyAt = (pixel: number) => {
    const i = pixel * 4;
    return (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  };

  for (let start = 0; start < pixelCount; start++) {
    if (visited[start] || data[start * 4 + 3] < 16) continue;

    const colorKey = colorKeyAt(start);
    const component: number[] = [];
    const queue = [start];
    const boundaryColors = new Map<number, number>();
    let touchesTransparency = false;
    visited[start] = 1;

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const pixel = queue[cursor];
      component.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const neighbors = [
        x > 0 ? pixel - 1 : -1,
        x + 1 < width ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y + 1 < height ? pixel + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || data[neighbor * 4 + 3] < 16) {
          touchesTransparency = true;
          continue;
        }
        const neighborKey = colorKeyAt(neighbor);
        if (neighborKey === colorKey) {
          if (!visited[neighbor]) {
            visited[neighbor] = 1;
            queue.push(neighbor);
          }
        } else {
          boundaryColors.set(neighborKey, (boundaryColors.get(neighborKey) ?? 0) + 1);
        }
      }
    }

    // A transition shade normally touches two color families, while an outer
    // antialiased contour touches transparency. Both are part of a smooth edge.
    // Only absorb a tiny island fully enclosed by one uniform color.
    if (
      component.length >= threshold ||
      touchesTransparency ||
      boundaryColors.size !== 1
    ) continue;
    const replacement = [...boundaryColors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (replacement === undefined) continue;
    const r = (replacement >> 16) & 255;
    const g = (replacement >> 8) & 255;
    const b = replacement & 255;
    for (const pixel of component) {
      const i = pixel * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
  }

  return new ImageData(out, width, height);
}

export function snapSvgToPalette(
  svg: string,
  palette: readonly RGBColor[] = BASE_ICON_COLORS
): string {
  return svg.replace(
    /(fill|stroke)="(#[0-9a-f]{3}|#[0-9a-f]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))"/gi,
    (full, attr: string, value: string) => {
      const color = parseRgbString(value);
      if (!color) return full;
      const snapped = nearestPaletteColor(color, palette);
      return `${attr}="${rgbToString(snapped)}"`;
    }
  );
}

function countOpaqueLightNeutralPixels(imageData: ImageData): number {
  let count = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] < PALETTE_SAMPLE_ALPHA) continue;
    if (isLightNeutralFill({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] })) {
      count++;
    }
  }
  return count;
}

function totalOpaquePixels(imageData: ImageData): number {
  let count = 0;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] >= PALETTE_SAMPLE_ALPHA) count++;
  }
  return count;
}

function touchesTransparentNeighbor(imageData: ImageData, x: number, y: number): boolean {
  const { width, height, data } = imageData;
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return true;
  return (
    data[((y - 1) * width + x) * 4 + 3] < 16 ||
    data[((y + 1) * width + x) * 4 + 3] < 16 ||
    data[(y * width + (x - 1)) * 4 + 3] < 16 ||
    data[(y * width + (x + 1)) * 4 + 3] < 16
  );
}

function collectVisibleColorBuckets(imageData: ImageData): ColorCandidate[] {
  const buckets = new Map<number, ColorBucket>();

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] < PALETTE_SAMPLE_ALPHA) continue;
    const color = { r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] };
    if (isNearWhite(color)) continue;

    const pixel = i / 4;
    const x = pixel % imageData.width;
    const y = Math.floor(pixel / imageData.width);
    const edgeCount = touchesTransparentNeighbor(imageData, x, y) ? 1 : 0;
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
      bucket.edgeCount += edgeCount;
    } else {
      buckets.set(key, { ...color, count: 1, edgeCount });
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
      edgeCount: bucket.edgeCount,
    }))
    .sort((a, b) => b.count - a.count);
}

const supportedSourceCache = new WeakMap<object, SourceColorAnchor[]>();

/**
 * Standard palette refinement may average several unrelated edge shades into
 * a centroid that never existed in the raster. Keep only exact source colors
 * with either a coherent interior or repeated exact samples, so antialiased
 * boundary noise cannot expand into a traced region.
 */
function collectSupportedSourceColors(imageData: ImageData): SourceColorAnchor[] {
  const cached = supportedSourceCache.get(imageData);
  if (cached) return cached;

  const { data, width, height } = imageData;
  const buckets = new Map<number, SourceColorBucket>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < PALETTE_SAMPLE_ALPHA) continue;
    const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (isNearWhite(color)) continue;

    const pixel = i / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const key = quantizedColorKey(color);
    const neighborIndexes = [
      x > 0 ? i - 4 : -1,
      x + 1 < width ? i + 4 : -1,
      y > 0 ? i - width * 4 : -1,
      y + 1 < height ? i + width * 4 : -1,
    ];
    let comparableNeighbors = 0;
    let sameBucketNeighbors = 0;

    for (const neighbor of neighborIndexes) {
      if (neighbor < 0 || data[neighbor + 3] < PALETTE_SAMPLE_ALPHA) continue;
      comparableNeighbors++;
      if (
        quantizedColorKey({
          r: data[neighbor],
          g: data[neighbor + 1],
          b: data[neighbor + 2],
        }) === key
      ) {
        sameBucketNeighbors++;
      }
    }

    const isInterior =
      comparableNeighbors > 0 &&
      sameBucketNeighbors >= Math.max(1, Math.ceil(comparableNeighbors * 0.6));
    const exactKey = exactColorKey(color);
    const bucket = buckets.get(key);
    if (bucket) {
      if (isInterior) bucket.interiorCount++;
      bucket.exactCounts.set(exactKey, (bucket.exactCounts.get(exactKey) ?? 0) + 1);
    } else {
      buckets.set(key, {
        interiorCount: isInterior ? 1 : 0,
        exactCounts: new Map([[exactKey, 1]]),
      });
    }
  }

  const totalOpaque = totalOpaquePixels(imageData);
  const anchors = [...buckets.values()].map((bucket) => {
    const representative = [...bucket.exactCounts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0] - b[0]
    )[0];
    return {
      ...colorFromExactKey(representative[0]),
      interiorCount: bucket.interiorCount,
      representativeCount: representative[1],
    };
  });
  const minInteriorCount = Math.max(1, Math.ceil(totalOpaque * 0.00005));
  const minRepeatedCount = Math.max(2, Math.ceil(totalOpaque * 0.00005));
  const supported = totalOpaque < 256
    ? anchors
    : anchors.filter(
        (anchor) =>
          anchor.interiorCount >= minInteriorCount ||
          anchor.representativeCount >= minRepeatedCount
      );
  const result = supported.length > 0 ? supported : anchors;
  supportedSourceCache.set(imageData, result);
  return result;
}

function anchorPaletteToSupportedSource(
  palette: readonly RGBColor[],
  fixedCount: number,
  supported: readonly SourceColorAnchor[]
): RGBColor[] {
  const nearestUnusedSource = (color: RGBColor, used: ReadonlySet<number>) => {
    let best: SourceColorAnchor | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of supported) {
      if (used.has(exactColorKey(candidate))) continue;
      const distance = colorDistanceSq(color, candidate);
      if (
        distance < bestDistance ||
        (distance === bestDistance &&
          (!best ||
            candidate.interiorCount > best.interiorCount ||
            (candidate.interiorCount === best.interiorCount &&
              candidate.representativeCount > best.representativeCount)))
      ) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best;
  };
  const anchored: RGBColor[] = [];
  const used = new Set<number>();

  for (const color of palette.slice(0, fixedCount)) {
    // Pure white is an intentional semantic anchor for enclosed light fills.
    const nearest = nearestUnusedSource(color, used);
    const fixed = exactColorKey(color) === 0xffffff || !nearest
      ? color
      : toRgb(nearest);
    const key = exactColorKey(fixed);
    if (used.has(key)) continue;
    used.add(key);
    anchored.push({ ...fixed });
  }

  for (const color of palette.slice(fixedCount)) {
    const source = nearestUnusedSource(color, used);
    if (!source) break;

    const anchoredColor = toRgb(source);
    used.add(exactColorKey(anchoredColor));
    anchored.push({ ...anchoredColor });
  }

  return anchored;
}

export function pickDarkOutlineColorFromImage(imageData: ImageData): RGBColor | null {
  const candidates = collectVisibleColorBuckets(imageData)
    .filter((color) => isDarkOutlineColor(color) || isDarkLineColor(color))
    .sort((a, b) => {
      const edgeDelta = b.edgeCount - a.edgeCount;
      if (edgeDelta !== 0) return edgeDelta;
      const lightDelta = luminance(a) - luminance(b);
      if (lightDelta !== 0) return lightDelta;
      return b.count - a.count;
    });

  return candidates[0] ? toRgb(candidates[0]) : null;
}

function refinePaletteFromImage(
  imageData: ImageData,
  initialPalette: readonly RGBColor[],
  cycles: number,
  fixedColors: readonly RGBColor[],
  sourceCandidates?: readonly SourceColorAnchor[]
): RGBColor[] {
  const passCount = Math.max(1, Math.min(8, Math.round(cycles)));
  const fixedCount = fixedColors.length;
  let palette = initialPalette.map((color) => ({ ...color }));
  if (palette.length === 0) return palette;

  for (let pass = 1; pass < passCount; pass++) {
    const sums = palette.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] < PALETTE_SAMPLE_ALPHA) continue;
      const color = { r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] };
      if (isNearWhite(color)) continue;
      const index = paletteColorIndex(color, palette);
      sums[index].r += color.r;
      sums[index].g += color.g;
      sums[index].b += color.b;
      sums[index].count++;
    }

    palette = palette.map((color, index) => {
      if (index < fixedCount) return { ...color };
      const sum = sums[index];
      if (sum.count === 0) return color;
      return {
        r: Math.round(sum.r / sum.count),
        g: Math.round(sum.g / sum.count),
        b: Math.round(sum.b / sum.count),
      };
    });
  }

  return sourceCandidates
    ? anchorPaletteToSupportedSource(palette, fixedCount, sourceCandidates)
    : palette;
}

function candidateRgb(color: ColorCandidate): RGBColor {
  return { r: color.r, g: color.g, b: color.b };
}

function colorProminence(color: ColorCandidate, totalOpaque: number): number {
  return color.count / Math.max(1, totalOpaque);
}

function accentScore(color: ColorCandidate): number {
  const sat = saturationRange(color);
  const light = luminance(color);
  const midLightBonus = 1 - Math.min(1, Math.abs(light - 150) / 150);
  return color.count * (sat / 255) * (0.65 + midLightBonus * 0.35);
}

function distanceToPaletteSq(color: RGBColor, palette: readonly RGBColor[]): number {
  if (palette.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...palette.map((entry) => colorDistanceSq(color, entry)));
}

function distinctColorScore(color: ColorCandidate, selected: readonly RGBColor[]): number {
  const distance = Math.sqrt(distanceToPaletteSq(color, selected));
  return distance * Math.sqrt(color.count);
}

export function suggestFlatIconPaletteFromImage(
  imageData: ImageData,
  maxColors: number,
  colorQuantCycles = 6
): TracePaletteColor[] {
  const limit = Math.max(2, Math.min(8, Math.floor(maxColors)));
  const candidates = collectVisibleColorBuckets(imageData);
  const selected: RGBColor[] = [];
  const fixedColors: RGBColor[] = [];
  const stableColorIndexes = new Set<number>();
  const totalOpaque = totalOpaquePixels(imageData);
  const minProminentCount = Math.max(2, Math.ceil(totalOpaque * 0.004));
  const minAccentCount = Math.max(1, Math.ceil(totalOpaque * 0.001));

  const addColor = (color: RGBColor, threshold = 34) => {
    if (selected.length >= limit) return;
    if (!isSimilarToAny(color, selected, threshold)) selected.push({ ...color });
  };
  const addFixedColor = (color: RGBColor, threshold = 18) => {
    if (selected.length >= limit) return;
    if (isSimilarToAny(color, selected, threshold)) return;
    selected.push({ ...color });
    fixedColors.push({ ...color });
  };

  const source = candidates.filter((color) => color.count >= minProminentCount);
  const outline = pickDarkOutlineColorFromImage(imageData);
  if (outline) addFixedColor(outline);

  const lightNeutralPixels = countOpaqueLightNeutralPixels(imageData);
  if (lightNeutralPixels / Math.max(1, totalOpaque) >= 0.015) {
    addFixedColor({ r: 255, g: 255, b: 255 }, 20);
  }

  const accents = candidates
    .filter((color) => {
      const sat = saturationRange(color);
      const light = luminance(color);
      return (
        color.count >= minAccentCount &&
        sat >= 42 &&
        light >= 45 &&
        !isDarkOutlineColor(color) &&
        !isDarkLineColor(color)
      );
    })
    .sort((a, b) => accentScore(b) - accentScore(a));

  for (const color of accents) {
    const nextIndex = selected.length;
    addColor(candidateRgb(color), 42);
    if (selected.length > nextIndex) stableColorIndexes.add(nextIndex);
  }

  const blackCandidates = source
    .filter(isTrueBlackFill)
    .filter((color) => {
      const prominence = colorProminence(color, totalOpaque);
      const edgeRatio = color.edgeCount / Math.max(1, color.count);
      return prominence >= 0.045 && (!outline || edgeRatio < 0.5);
    })
    .sort((a, b) => b.count - a.count);
  if (blackCandidates[0]) {
    addColor(candidateRgb(blackCandidates[0]), 22);
  }

  const neutralCandidates = source
    .filter((color) => isDropShadowColor(color) && colorProminence(color, totalOpaque) >= 0.025)
    .sort((a, b) => b.count - a.count);
  if (neutralCandidates[0]) {
    addColor(candidateRgb(neutralCandidates[0]), 32);
  }

  const minExpectedColors = Math.min(limit, 3);
  while (selected.length < minExpectedColors) {
    const distinct = candidates
      .filter((color) => color.count >= minAccentCount)
      .filter((color) => !isLightNeutralFill(color))
      .filter((color) => !isSimilarToAny(candidateRgb(color), selected, 38))
      .sort((a, b) => distinctColorScore(b, selected) - distinctColorScore(a, selected))[0];
    if (!distinct) break;
    addColor(candidateRgb(distinct), 24);
  }

  for (const color of source.sort((a, b) => b.count - a.count)) {
    if (selected.length >= limit) break;
    if (isLightNeutralFill(color)) continue;
    if (isTrueBlackFill(color) && outline && colorProminence(color, totalOpaque) < 0.08) continue;
    addColor(candidateRgb(color), isDarkOutlineColor(color) || isDarkLineColor(color) ? 54 : 38);
  }

  if (selected.length === 0) addColor(ICON_BASE_PALETTE[0].color);

  const refined = refinePaletteFromImage(imageData, selected, colorQuantCycles, fixedColors);
  const mapped = refined.map((color, index) => ({
    ...(stableColorIndexes.has(index) ? selected[index] : color),
    a: 255,
  }));
  // Drop JPEG-invented lighter twins of the same accent before tracing so solid
  // shapes stay one fill and can regularize as full primitives.
  return collapseNearDuplicateAccents(mapped).map((color) => ({ ...color, a: 255 }));
}

function suggestPaletteAtLimit(imageData: ImageData, maxColors: number, colorQuantCycles = 6): TracePaletteColor[] {
  const limit = Math.max(2, Math.min(256, Math.floor(maxColors)));
  const candidates = collectVisibleColorBuckets(imageData);
  const selected: RGBColor[] = [];
  const fixedColors: RGBColor[] = [];
  const defaultThreshold = limit >= 48 ? 4 : limit >= 32 ? 6 : limit >= 18 ? 10 : limit >= 12 ? 18 : 32;
  const addColor = (color: RGBColor, threshold = defaultThreshold) => {
    if (selected.length >= limit) return;
    if (!isSimilarToAny(color, selected, threshold)) selected.push({ ...color });
  };
  const addFixedColor = (color: RGBColor, threshold = 8) => {
    if (selected.length >= limit) return;
    if (isSimilarToAny(color, selected, threshold)) return;
    selected.push({ ...color });
    fixedColors.push({ ...color });
  };

  const totalOpaque = totalOpaquePixels(imageData);
  const minProminentCount = Math.max(3, Math.ceil(totalOpaque * (limit >= 32 ? 0.0008 : limit >= 18 ? 0.0015 : 0.003)));
  const prominent = candidates.filter((color) => color.count >= minProminentCount);
  const source = prominent.length >= Math.min(limit, 4) ? prominent : candidates;
  const fixedOutlineColor = pickDarkOutlineColorFromImage(imageData);
  if (fixedOutlineColor) {
    addFixedColor(fixedOutlineColor);
  }

  // Enclosed white fills (face, belly, highlights) survive edge flood-fill — keep them in the palette.
  const lightNeutralPixels = countOpaqueLightNeutralPixels(imageData);
  if (lightNeutralPixels > 0 && lightNeutralPixels / Math.max(1, totalOpaque) >= 0.02) {
    addFixedColor({ r: 255, g: 255, b: 255 });
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

  const outlineCandidates = source
    .filter((color) => isDarkOutlineColor(color) || isDarkLineColor(color))
    .sort((a, b) => (b.edgeCount * 3 + b.count) - (a.edgeCount * 3 + a.count));
  if (outlineCandidates[0]) {
    addColor(toRgb(outlineCandidates[0]), limit >= 32 ? 8 : 48);
  }

  for (const color of source) {
    if (selected.length >= limit) break;
    if (isLightNeutralFill(color)) continue;
    const isAccent = saturationRange(color) >= 36 && luminance(color) > 45;
    const isCream = colorDistanceSq(color, ICON_BASE_PALETTE[1].color) <= 56 * 56;
    if (isAccent && !isCream && !isDarkOutlineColor(color)) addColor(toRgb(color));
  }

  const largeDarkAccentCount = Math.max(minProminentCount * 3, Math.ceil(totalOpaque * 0.01));
  for (const color of source) {
    if (selected.length >= limit) break;
    if (isLightNeutralFill(color)) continue;
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
    if (isLightNeutralFill(color)) continue;
    const isDarkAccent = saturationRange(color) >= 30 && luminance(color) <= 55;
    addColor(toRgb(color), isDarkOutlineColor(color) ? (limit >= 32 ? 8 : 48) : isDarkAccent ? 14 : defaultThreshold);
  }

  if (selected.length < limit && limit >= 12) {
    for (const color of source) {
      if (selected.length >= limit) break;
      if (isLightNeutralFill(color)) continue;
      const isDarkAccent = saturationRange(color) >= 30 && luminance(color) <= 55;
      addColor(toRgb(color), isDarkOutlineColor(color) ? (limit >= 32 ? 8 : 48) : isDarkAccent ? 10 : 4);
    }
  }

  if (selected.length === 0) addColor(ICON_BASE_PALETTE[0].color);

  const refined = refinePaletteFromImage(
    imageData,
    selected,
    colorQuantCycles,
    fixedColors,
    collectSupportedSourceColors(imageData)
  );
  return refined.map((color) => ({ ...color, a: 255 }));
}

const paletteStageCache = new WeakMap<object, Map<string, TracePaletteColor[]>>();

function cachedPaletteStage(
  imageData: ImageData,
  limit: number,
  colorQuantCycles: number
): TracePaletteColor[] {
  let cache = paletteStageCache.get(imageData);
  if (!cache) {
    cache = new Map();
    paletteStageCache.set(imageData, cache);
  }
  const key = `${limit}:${colorQuantCycles}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const palette = suggestPaletteAtLimit(imageData, limit, colorQuantCycles);
  cache.set(key, palette);
  return palette;
}

/**
 * Build Standard palettes progressively. Every larger palette begins with the
 * exact smaller palette, then appends newly supported source colors. Changing
 * 16 → 32 colors therefore enriches the result instead of re-clustering and
 * replacing colors that already described the artwork correctly.
 */
export function suggestPaletteFromImage(
  imageData: ImageData,
  maxColors: number,
  colorQuantCycles = 6
): TracePaletteColor[] {
  const limit = Math.max(2, Math.min(256, Math.floor(maxColors)));
  if (limit < 4) return cachedPaletteStage(imageData, limit, colorQuantCycles);

  // Four is the smallest palette exposed by the UI and therefore the stable
  // visual baseline. Starting at two would anchor an overly destructive set.
  const stages = [4, 8, 16, 32, 64, 128, 256].filter((stage) => stage <= limit);
  if (stages[stages.length - 1] !== limit) stages.push(limit);

  const stable: TracePaletteColor[] = [];
  for (const stage of stages) {
    const candidates = cachedPaletteStage(imageData, stage, colorQuantCycles);
    for (const candidate of candidates) {
      if (stable.length >= stage) break;
      if (!stable.some((color) => colorDistanceSq(color, candidate) === 0)) {
        stable.push({ ...candidate });
      }
    }
  }

  return stable.slice(0, limit);
}

export function iconTracePalette(): TracePaletteColor[] {
  return ICON_BASE_PALETTE.map((entry) => ({ ...entry.color, a: 255 }));
}
