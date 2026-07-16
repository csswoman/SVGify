// Edge flood-fill background removal.
// Detects the background color from the image corners, then flood-fills
// connected pixels matching that color (within a tolerance) to transparent.
// Pure client-side, operates on a copy of the ImageData — never mutates input.

import { isNearWhite } from './paletteExtraction';

/**
 * The flood fill never grows past this radius. Tolerances above the cap only
 * widen the contact-halo band removed right next to the filled background, so
 * a solid plateau (a dark navy mountain on a black canvas) survives even a
 * maxed-out slider.
 */
const CORE_TOLERANCE_CAP = 48;

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

function matteHueMatches(
  r: number,
  g: number,
  b: number,
  cr: number,
  cg: number,
  cb: number
): boolean {
  const strength = r * r + g * g + b * b;
  const candidateStrength = cr * cr + cg * cg + cb * cb;
  if (strength < 1 || candidateStrength < 1) return false;

  const mean = (r + g + b) / 3;
  const candidateMean = (cr + cg + cb) / 3;
  const rr = r - mean;
  const gg = g - mean;
  const bb = b - mean;
  const crr = cr - candidateMean;
  const cgg = cg - candidateMean;
  const cbb = cb - candidateMean;
  const chromaStrength = rr * rr + gg * gg + bb * bb;
  const candidateChromaStrength = crr * crr + cgg * cgg + cbb * cbb;
  const saturation = Math.sqrt(chromaStrength / strength);
  const candidateSaturation = Math.sqrt(candidateChromaStrength / candidateStrength);

  if (saturation < 0.1) return candidateSaturation < 0.16;
  if (candidateSaturation < 0.08) return false;

  const dot = rr * crr + gg * cgg + bb * cbb;
  return dot > 0 && dot * dot >= chromaStrength * candidateChromaStrength * 0.9;
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

/**
 * Pixels at a raster edge can be pre-blended with the canvas color. After a
 * black canvas is removed those pixels become dark outlines unless their
 * original foreground color and coverage are recovered first.
 */
function decontaminateOpaqueBackgroundFringe(
  output: ImageData,
  source: Uint8ClampedArray,
  background: { r: number; g: number; b: number },
  removed: Uint8Array,
  fringe: readonly number[],
  searchRadius = 4,
  guardHue = false
): void {
  const { data, width, height } = output;

  for (const pixel of fringe) {
    if (removed[pixel]) continue;
    const index = pixel * 4;
    if (source[index + 3] < 16 || data[index + 3] < 16) continue;

    const r = source[index] - background.r;
    const g = source[index + 1] - background.g;
    const b = source[index + 2] - background.b;
    const strength = r * r + g * g + b * b;
    if (strength < 1) continue;

    const x = pixel % width;
    const y = (pixel - x) / width;
    let foreground = -1;
    let foregroundStrength = strength;

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const candidate = ny * width + nx;
        if (removed[candidate]) continue;
        const candidateIndex = candidate * 4;
        if (source[candidateIndex + 3] < 16) continue;

        const cr = source[candidateIndex] - background.r;
        const cg = source[candidateIndex + 1] - background.g;
        const cb = source[candidateIndex + 2] - background.b;
        const candidateStrength = cr * cr + cg * cg + cb * cb;
        if (candidateStrength <= foregroundStrength * 1.05) continue;

        const dot = r * cr + g * cg + b * cb;
        // A true matte edge stays on the line between the canvas color and
        // its foreground color. Do not alter unrelated nearby artwork.
        // JPEG/WebP antialiasing shifts hue slightly while compositing an
        // accent over black (the yellow edge loses proportionally more blue).
        // The fringe is already limited to two pixels beside the removed
        // canvas, so allow that small shift instead of retaining dark brown
        // fragments as a separate traced color.
        if (
          guardHue
            ? !matteHueMatches(r, g, b, cr, cg, cb)
            : dot <= 0 || dot * dot < strength * candidateStrength * 0.9
        ) continue;

        foreground = candidate;
        foregroundStrength = candidateStrength;
      }
    }

    if (foreground < 0) continue;

    const foregroundIndex = foreground * 4;
    const fr = source[foregroundIndex] - background.r;
    const fg = source[foregroundIndex + 1] - background.g;
    const fb = source[foregroundIndex + 2] - background.b;
    const alpha = Math.max(0, Math.min(1, (r * fr + g * fg + b * fb) / foregroundStrength));
    const residualSq = strength - alpha * alpha * foregroundStrength;
    if (alpha >= 0.98 || residualSq > Math.max(64, strength * 0.1)) continue;

    // The vectorize pipeline hard-thresholds alpha at 180 and keeps its slider
    // hidden for opaque uploads, so fractional coverage here came back as
    // 2-3px bites on shape borders (sun/star notches). Snap membership at half
    // coverage instead: mostly-foreground pixels keep their recovered color at
    // full opacity, the rest dissolve into the removed background.
    if (alpha < 0.5) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
      continue;
    }

    data[index] = source[foregroundIndex];
    data[index + 1] = source[foregroundIndex + 1];
    data[index + 2] = source[foregroundIndex + 2];
    data[index + 3] = source[index + 3];
  }
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
  /** Internal cap used for low-contrast artwork on an opaque matte. */
  matteCoreToleranceCap?: number;
  /** Internal depth used to reconstruct antialiasing baked into an opaque matte. */
  matteFringeDepth?: number;
  /** Prevent nearby shapes with a different hue from contaminating matte edges. */
  matteHueGuard?: boolean;
}

/**
 * Remove the background and return a NEW ImageData (input is never mutated).
 * Connected (flood-fill) or global color-key, depending on `contiguous`.
 */
export function removeBackground(
  imageData: ImageData,
  options: RemoveBackgroundOptions = {}
): ImageData {
  const {
    tolerance = 48,
    seeds,
    contiguous = true,
    matteCoreToleranceCap = CORE_TOLERANCE_CAP,
    matteFringeDepth = 2,
    matteHueGuard = false,
  } = options;
  const { width, height } = imageData;
  // Work on a copy so the original (used for the "Original" preview) is untouched.
  const out = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  const data = out.data;

  const autoSeeds = seeds && seeds.length > 0
    ? []
    : opaquePixelsTouchingTransparency(data, width, height);
  const autoStartPixels = autoSeeds.length > 0 ? autoSeeds : edgePixels(width, height);
  const hasTransparentMargin = autoSeeds.length > 0;
  // A fully opaque canvas depends entirely on the color-distance radius to
  // separate its background from the artwork. Expanding that radius by √3
  // erases dark navy fills from a black canvas. Images that already have a
  // transparent margin still use the wider, per-channel slack to clear their
  // baked checkerboard or anti-aliased halo.
  //
  // Hysteresis: the fill itself uses the capped core radius; anything between
  // the core and the user radius is cleared afterwards only where it touches
  // the removed canvas (see the extended band pass below).
  const coreTolerance = hasTransparentMargin
    ? tolerance
    : Math.min(tolerance, matteCoreToleranceCap);
  const tolSq = coreTolerance * coreTolerance * (hasTransparentMargin ? 3 : 1);
  const extendedTolSq = hasTransparentMargin ? tolSq : tolerance * tolerance;

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
    perceivedLightness(bg.r, bg.g, bg.b) - coreTolerance * 3
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
  // No contiguity means no plateau to protect, so the full user radius applies.
  if (!contiguous) {
    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      if (
        matchesBackground(i) ||
        colorDistanceSq(data, i, bg.r, bg.g, bg.b) <= extendedTolSq
      ) makeTransparent(i);
    }
    return out;
  }

  // ── Flood-fill (Contiguous ON): remove only the connected region ──
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const shouldDecontaminateFringe = autoSeeds.length === 0;
  const removed = shouldDecontaminateFringe ? new Uint8Array(width * height) : null;
  const fringeDepth = shouldDecontaminateFringe ? new Uint8Array(width * height) : null;
  const fringe: number[] = [];

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
    if (!matchesBackground(i)) {
      if (fringeDepth && data[i + 3] >= 16 && !fringeDepth[p]) {
        fringeDepth[p] = 1;
        fringe.push(p);
      }
      continue;
    }

    if (removed) removed[p] = 1;
    makeTransparent(i);

    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  if (removed && fringeDepth && extendedTolSq > tolSq && fringe.length > 0) {
    // Extended band: pixels between the core and user radius are removed only
    // where they touch the removed canvas itself. Halos hugging the background
    // disappear, but the fill cannot creep ring by ring into the interior of a
    // distinct shape whose color falls inside the wider radius.
    const extendedRemovals: number[] = [];
    for (const pixel of fringe) {
      const i = pixel * 4;
      if (data[i + 3] < 16) continue;
      if (colorDistanceSq(data, i, bg.r, bg.g, bg.b) > extendedTolSq) continue;

      const x = pixel % width;
      const y = (pixel - x) / width;
      const touchesRemoved =
        (x > 0 && removed[pixel - 1] === 1) ||
        (x < width - 1 && removed[pixel + 1] === 1) ||
        (y > 0 && removed[pixel - width] === 1) ||
        (y < height - 1 && removed[pixel + width] === 1);
      if (touchesRemoved) extendedRemovals.push(pixel);
    }

    if (extendedRemovals.length > 0) {
      for (const pixel of extendedRemovals) {
        removed[pixel] = 1;
        makeTransparent(pixel * 4);
      }

      // The fringe list predates the extended removals; rebuild it around the
      // final removed region so decontamination sees the fresh boundary.
      fringe.length = 0;
      fringeDepth.fill(0);
      for (let p = 0; p < width * height; p++) {
        if (!removed[p]) continue;
        const x = p % width;
        const y = (p - x) / width;
        const neighbors = [
          x > 0 ? p - 1 : -1,
          x < width - 1 ? p + 1 : -1,
          y > 0 ? p - width : -1,
          y < height - 1 ? p + width : -1,
        ];
        for (const neighbor of neighbors) {
          if (neighbor < 0 || removed[neighbor] || fringeDepth[neighbor]) continue;
          if (data[neighbor * 4 + 3] < 16) continue;
          fringeDepth[neighbor] = 1;
          fringe.push(neighbor);
        }
      }
    }
  }

  if (removed && fringeDepth && fringe.length > 0) {
    // Include one extra ring: antialiasing on a small uploaded logo often
    // spans more than the first non-background pixel.
    for (let cursor = 0; cursor < fringe.length; cursor++) {
      const pixel = fringe[cursor];
      if (fringeDepth[pixel] >= matteFringeDepth) continue;

      const x = pixel % width;
      const y = (pixel - x) / width;
      const neighbors = [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor < 0 ||
          removed[neighbor] ||
          fringeDepth[neighbor] ||
          data[neighbor * 4 + 3] < 16
        ) continue;
        fringeDepth[neighbor] = fringeDepth[pixel] + 1;
        fringe.push(neighbor);
      }
    }

    decontaminateOpaqueBackgroundFringe(
      out,
      imageData.data,
      bg,
      removed,
      fringe,
      Math.max(4, matteFringeDepth),
      matteHueGuard
    );
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
