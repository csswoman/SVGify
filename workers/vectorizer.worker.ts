import ImageTracer from 'imagetracerjs';
import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { optimizeSvg } from '@/lib/optimizeSvg';
import { normalizeSvgPalette } from '@/lib/colorUtils';
import { simplifySvgPaths } from '@/lib/simplifyPath';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, settings } = event.data;

  if (type === 'vectorize' && imageData && settings) {
    try {
      vectorizeImage(imageData, settings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      self.postMessage({ type: 'error', message } satisfies WorkerResponse);
    }
  }
};

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings): void {
  try {
    // Merge with defaults
    const options = { ...VECTORIZE_DEFAULTS, ...settings };
    const targetColors = Math.min(options.numberofcolors, 12);
    const effectivePathOmit =
      targetColors >= 10
        ? Math.min(options.pathomit, 10)
        : targetColors >= 7
          ? Math.min(options.pathomit, 16)
          : options.pathomit;
    const { imageData: tracedImageData, palette } = quantizeToDominantPalette(imageData, targetColors);

    // Call imagetracerjs
    const svgString = ImageTracer.imagedataToSVG(tracedImageData, {
      numberofcolors: palette.length,
      pal: palette,
      colorquantcycles: 1,
      mincolorratio: 0,
      ltres: options.ltres,
      qtres: options.qtres,
      colorsampling: 0,
      strokewidth: options.strokewidth,
      scale: options.scale,
      pathomit: effectivePathOmit,
      roundcoords: options.roundcoords,
      // Keep the SVG compact:
      desc: false,       // omit per-path desc attributes
      viewbox: true,     // use a viewBox instead of duplicated width/height
    });

    // Normalize the palette: collapse near-duplicate shades into clean, distinct
    // colors, capped at the requested color count. Gives a tidy palette up front.
    const withoutTransparent = removeTransparentPaths(svgString);
    const normalized = normalizeSvgPalette(withoutTransparent, targetColors >= 7 ? 18 : 32, targetColors);
    const withoutSpeckles = removeTinyPaths(normalized, Math.max(effectivePathOmit, targetColors >= 10 ? 8 : 16));
    const simplified = simplifySvgPaths(withoutSpeckles, 1.1, options.roundcoords);

    // Shrink the machine-generated SVG (drop redundant strokes/opacity, round coords).
    const optimized = optimizeSvg(simplified, {
      dropDefaultOpacity: true,
      coordDecimals: options.roundcoords,
      removeStroke: true,
    });

    // Send result back
    self.postMessage({ type: 'done', svg: optimized } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
}

function removeTinyPaths(svg: string, minCoordinateCount: number): string {
  return svg.replace(/<path\b[^>]*\bd="([^"]*)"[^>]*>/g, (tag: string, d: string) => {
    const coordinateCount = (d.match(/-?\d*\.?\d+/g) ?? []).length;
    return coordinateCount < minCoordinateCount ? '' : tag;
  });
}

function removeTransparentPaths(svg: string): string {
  return svg.replace(/<path\b(?=[^>]*\bopacity="0(?:\.0+)?")[^>]*>/g, '');
}

type ColorBucket = {
  r: number;
  g: number;
  b: number;
  count: number;
};

type TracePaletteColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function quantizeToDominantPalette(
  imageData: ImageData,
  maxColors: number
): { imageData: ImageData; palette: TracePaletteColor[] } {
  const colorCount = Math.max(2, Math.min(64, Math.round(maxColors)));
  const buckets = new Map<number, ColorBucket>();
  const data = imageData.data;
  const matte = estimateTransparentMatte(imageData);
  let hasTransparent = false;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) {
      hasTransparent = true;
      continue;
    }

    // 5-bit buckets group near-identical shades before ranking by pixel count.
    const rq = data[i] >> 3;
    const gq = data[i + 1] >> 3;
    const bq = data[i + 2] >> 3;
    const key = (rq << 10) | (gq << 5) | bq;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      bucket.count++;
    } else {
      buckets.set(key, {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        count: 1,
      });
    }
  }

  if (buckets.size === 0) {
    return {
      imageData,
      palette: [{ r: 255, g: 255, b: 255, a: 0 }],
    };
  }

  const candidates = [...buckets.values()]
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
    }))
    .sort((a, b) => scorePaletteCandidate(b) - scorePaletteCandidate(a));

  const palette: ColorBucket[] = [];
  const minDistanceSq = 38 * 38;
  for (const color of candidates) {
    const similar = palette.find((p) => colorDistanceSq(color, p) <= minDistanceSq);
    if (similar) continue;
    palette.push(color);
    if (palette.length >= colorCount) break;
  }

  for (const color of candidates) {
    if (palette.length >= colorCount) break;
    if (!palette.includes(color)) palette.push(color);
  }

  preserveDominantNeutral(candidates, palette, colorCount);

  const out = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 16) {
      out.data[i] = matte.r;
      out.data[i + 1] = matte.g;
      out.data[i + 2] = matte.b;
      out.data[i + 3] = 0;
      continue;
    }
    let nearest = palette[0];
    let best = colorDistanceSq(
      { r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] },
      nearest
    );
    for (let j = 1; j < palette.length; j++) {
      const dist = colorDistanceSq(
        { r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] },
        palette[j]
      );
      if (dist < best) {
        best = dist;
        nearest = palette[j];
      }
    }
    out.data[i] = nearest.r;
    out.data[i + 1] = nearest.g;
    out.data[i + 2] = nearest.b;
  }

  const tracePalette: TracePaletteColor[] = palette.map((color) => ({
    r: color.r,
    g: color.g,
    b: color.b,
    a: 255,
  }));

  if (hasTransparent) {
    tracePalette.push({ r: matte.r, g: matte.g, b: matte.b, a: 0 });
  }

  return { imageData: out, palette: tracePalette };
}

function preserveDominantNeutral(
  candidates: ColorBucket[],
  palette: ColorBucket[],
  colorCount: number
): void {
  if (palette.length === 0 || colorCount < 5) return;

  const total = candidates.reduce((sum, color) => sum + color.count, 0);
  const neutral = candidates.find((color) => {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const lightness = luminance(color);
    return max - min <= 24 && lightness >= 80 && lightness <= 235 && color.count / total >= 0.01;
  });
  if (!neutral) return;

  const alreadyCovered = palette.some((color) => colorDistanceSq(color, neutral) <= 24 * 24);
  if (alreadyCovered) return;

  if (palette.length < colorCount) {
    palette.push(neutral);
    return;
  }

  let replaceIndex = -1;
  let lowestScore = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    if (max - min <= 24) continue;

    const score = scorePaletteCandidate(color);
    if (score < lowestScore) {
      lowestScore = score;
      replaceIndex = i;
    }
  }

  if (replaceIndex >= 0) palette[replaceIndex] = neutral;
}

function estimateTransparentMatte(imageData: ImageData): Pick<ColorBucket, 'r' | 'g' | 'b'> {
  const data = imageData.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function scorePaletteCandidate(color: ColorBucket): number {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const saturation = max - min;
  const darkness = 255 - luminance(color);
  const darkLineBoost = darkness > 150 ? 1.45 : 1;
  const colorBoost = saturation > 35 ? 1.2 : 1;
  return color.count * darkLineBoost * colorBoost;
}

function luminance(c: Pick<ColorBucket, 'r' | 'g' | 'b'>): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

function colorDistanceSq(
  a: Pick<ColorBucket, 'r' | 'g' | 'b'>,
  b: Pick<ColorBucket, 'r' | 'g' | 'b'>
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}
