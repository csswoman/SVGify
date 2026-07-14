// Edge flood-fill background removal.
// Detects the background color from the image corners, then flood-fills
// connected pixels matching that color (within a tolerance) to transparent.
// Pure client-side, operates on a copy of the ImageData — never mutates input.

import { isNearWhite } from './paletteExtraction';
function colorDistanceSq(
  data: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number
): number {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

function channelRange(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function perceivedLightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function averagePixelColors(
  data: Uint8ClampedArray,
  pixels: readonly number[]
): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of pixels) {
    const i = pixel * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return {
    r: Math.round(r / pixels.length),
    g: Math.round(g / pixels.length),
    b: Math.round(b / pixels.length),
  };
}

function edgePixels(width: number, height: number): number[] {
  const pixels: number[] = [];
  for (let x = 0; x < width; x++) {
    pixels.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    pixels.push(y * width, y * width + width - 1);
  }
  return pixels;
}

/**
 * Find the first visible pixels around an existing transparent margin.
 * Screenshots downloaded from preview sites often contain a baked checkerboard
 * inside a transparent canvas; sampling only the image corners sees the outer
 * transparency and misses that real raster background entirely.
 */
function opaquePixelsTouchingTransparency(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const boundary = new Uint8Array(width * height);
  const pixels: number[] = [];

  const addIfOpaque = (pixel: number) => {
    if (boundary[pixel] || data[pixel * 4 + 3] < 16) return;
    boundary[pixel] = 1;
    pixels.push(pixel);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if (data[pixel * 4 + 3] >= 16) continue;
      if (x > 0) addIfOpaque(pixel - 1);
      if (x < width - 1) addIfOpaque(pixel + 1);
      if (y > 0) addIfOpaque(pixel - width);
      if (y < height - 1) addIfOpaque(pixel + width);
    }
  }

  return pixels;
}

/** A point (in pixel coordinates) the user clicked to seed the flood-fill. */
export interface SeedPoint {
  x: number;
  y: number;
}

export interface RemoveBackgroundOptions {
  /** 0..255 — how close a pixel must be to the background color to be removed. */
  tolerance?: number;
  /** User-picked points. The background color is averaged from these. Omit for corner auto-detect. */
  seeds?: SeedPoint[];
  /**
   * true  → only remove the connected region touching the seed (flood-fill, like Photoshop's
   *         Magic Wand with "Contiguous" on).
   * false → remove every matching pixel anywhere in the image (Contiguous off).
   * Defaults to true.
   */
  contiguous?: boolean;
}

/**
 * Remove the background and return a NEW ImageData (input is never mutated).
 * Connected (flood-fill) or global color-key, depending on `contiguous`.
 */
export function removeBackground(
  imageData: ImageData,
  options: RemoveBackgroundOptions = {}
): ImageData {
  const { tolerance = 48, seeds, contiguous = true } = options;
  const { width, height } = imageData;
  // Work on a copy so the original (used for the "Original" preview) is untouched.
  const out = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  const data = out.data;
  const tolSq = tolerance * tolerance * 3; // scale across 3 channels

  const autoSeeds = seeds && seeds.length > 0
    ? []
    : opaquePixelsTouchingTransparency(data, width, height);
  const autoStartPixels = autoSeeds.length > 0 ? autoSeeds : edgePixels(width, height);

  // Background color: averaged from the user's seed points, the first opaque
  // boundary around transparency, or the image edge for a fully opaque image.
  let bg: { r: number; g: number; b: number };
  if (seeds && seeds.length > 0) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const s of seeds) {
      const px = Math.min(width - 1, Math.max(0, Math.round(s.x)));
      const py = Math.min(height - 1, Math.max(0, Math.round(s.y)));
      const i = (py * width + px) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    bg = {
      r: Math.round(r / seeds.length),
      g: Math.round(g / seeds.length),
      b: Math.round(b / seeds.length),
    };
  } else {
    bg = averagePixelColors(data, autoStartPixels);
  }

  const neutralBackground =
    channelRange(bg.r, bg.g, bg.b) <= 36 &&
    perceivedLightness(bg.r, bg.g, bg.b) >= 128;
  const neutralLightnessFloor = Math.max(
    64,
    perceivedLightness(bg.r, bg.g, bg.b) - tolerance * 3
  );
  const matchesBackground = (i: number) => {
    if (colorDistanceSq(data, i, bg.r, bg.g, bg.b) <= tolSq) return true;
    if (!neutralBackground) return false;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return (
      channelRange(r, g, b) <= 36 &&
      perceivedLightness(r, g, b) >= neutralLightnessFloor
    );
  };

  const makeTransparent = (i: number) => {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 0;
  };

  // ── Global color-key (Contiguous OFF): wipe every matching pixel anywhere ──
  if (!contiguous) {
    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      if (matchesBackground(i)) makeTransparent(i);
    }
    return out;
  }

  // ── Flood-fill (Contiguous ON): remove only the connected region ──
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  if (seeds && seeds.length > 0) {
    for (const s of seeds) {
      const px = Math.min(width - 1, Math.max(0, Math.round(s.x)));
      const py = Math.min(height - 1, Math.max(0, Math.round(s.y)));
      stack.push(py * width + px); // start the fill at each clicked point
    }
  } else {
    for (const pixel of autoStartPixels) stack.push(pixel);
  }

  while (stack.length > 0) {
    const p = stack.pop() as number;
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    if (!matchesBackground(i)) continue;

    makeTransparent(i);

    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  return out;
}

/**
 * Remove near-white pixels exposed to transparency (background halos / fringe).
 * Enclosed white fills surrounded by other colors are preserved.
 */
export function removeExposedNearWhiteFringe(
  imageData: ImageData,
  threshold = 244
): ImageData {
  const { width, height } = imageData;
  const out = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  const data = out.data;
  const peel = new Uint8Array(width * height);
  const queue: number[] = [];

  const tryPeel = (p: number) => {
    if (peel[p]) return;
    const i = p * 4;
    if (data[i + 3] < 16) return;
    if (!isNearWhite({ r: data[i], g: data[i + 1], b: data[i + 2] }, threshold)) return;
    peel[p] = 1;
    queue.push(p);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (data[p * 4 + 3] >= 16) continue;
      if (x > 0) tryPeel(p - 1);
      if (x < width - 1) tryPeel(p + 1);
      if (y > 0) tryPeel(p - width);
      if (y < height - 1) tryPeel(p + width);
    }
  }

  while (queue.length > 0) {
    const p = queue.pop() as number;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) tryPeel(p - 1);
    if (x < width - 1) tryPeel(p + 1);
    if (y > 0) tryPeel(p - width);
    if (y < height - 1) tryPeel(p + width);
  }

  for (let p = 0; p < width * height; p++) {
    if (peel[p]) data[p * 4 + 3] = 0;
  }

  return out;
}
