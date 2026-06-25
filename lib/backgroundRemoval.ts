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

/** Average the four corner pixels to estimate the background color. */
function estimateBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of corners) {
    r += data[c];
    g += data[c + 1];
    b += data[c + 2];
  }
  return {
    r: Math.round(r / corners.length),
    g: Math.round(g / corners.length),
    b: Math.round(b / corners.length),
  };
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

  // Background color: averaged from the user's seed points, or estimated from corners.
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
    bg = estimateBackgroundColor(data, width, height);
  }

  // ── Global color-key (Contiguous OFF): wipe every matching pixel anywhere ──
  if (!contiguous) {
    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      if (colorDistanceSq(data, i, bg.r, bg.g, bg.b) <= tolSq) data[i + 3] = 0;
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
    // Auto: seed from every edge pixel.
    for (let x = 0; x < width; x++) {
      stack.push(x); // top row
      stack.push((height - 1) * width + x); // bottom row
    }
    for (let y = 0; y < height; y++) {
      stack.push(y * width); // left column
      stack.push(y * width + (width - 1)); // right column
    }
  }

  while (stack.length > 0) {
    const p = stack.pop() as number;
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    if (colorDistanceSq(data, i, bg.r, bg.g, bg.b) > tolSq) continue;

    data[i + 3] = 0; // match → transparent

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
