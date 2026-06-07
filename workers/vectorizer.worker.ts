import ImageTracer from 'imagetracerjs';
import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { optimizeSvg } from '@/lib/optimizeSvg';
import { normalizeSvgPalette } from '@/lib/colorUtils';
import { simplifySvgPaths } from '@/lib/simplifyPath';
import { main as vtracerInit, BinaryImageConverter } from 'vectortracer';

// Initialize VTracer WASM once when the worker starts.
let vtracerReady = false;
(async () => {
  try {
    await vtracerInit();
    vtracerReady = true;
  } catch {
    // WASM load failed — lineart mode will fall back gracefully
  }
})();

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

function applyBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  const r = Math.round(radius);
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const dst = new Uint8ClampedArray(data.length);

  // Pass 1: horizontal blur src → dst
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.min(Math.max(x + dx, 0), width - 1);
        const idx = (y * width + nx) * 4;
        rSum += src[idx];
        gSum += src[idx + 1];
        bSum += src[idx + 2];
        aSum += src[idx + 3];
        count++;
      }
      const oi = (y * width + x) * 4;
      dst[oi]     = rSum / count;
      dst[oi + 1] = gSum / count;
      dst[oi + 2] = bSum / count;
      dst[oi + 3] = aSum / count;
    }
  }

  // Pass 2: vertical blur dst → src
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(Math.max(y + dy, 0), height - 1);
        const idx = (ny * width + x) * 4;
        rSum += dst[idx];
        gSum += dst[idx + 1];
        bSum += dst[idx + 2];
        aSum += dst[idx + 3];
        count++;
      }
      const oi = (y * width + x) * 4;
      src[oi]     = rSum / count;
      src[oi + 1] = gSum / count;
      src[oi + 2] = bSum / count;
      src[oi + 3] = aSum / count;
    }
  }

  return new ImageData(src, width, height);
}

function binarizeOtsu(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;

  // Build grayscale histogram.
  const hist = new Float64Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[gray]++;
  }

  // Otsu's method to find optimal threshold.
  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > maxVar) { maxVar = between; threshold = t; }
  }

  // Apply threshold: dark pixels → black (0), light → white (255).
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const val = gray <= threshold ? 0 : 255;
    out[i] = out[i + 1] = out[i + 2] = val;
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}

function vectorizeLineart(imageData: ImageData, settings: VectorizeSettings): string {
  if (!vtracerReady) throw new Error('VTracer WASM not ready');

  const converter = new BinaryImageConverter(
    imageData,
    {
      debug: false,
      mode: 'spline',
      cornerThreshold: settings.vtracerCornerThreshold,
      spliceThreshold: settings.vtracerSpliceThreshold,
      filterSpeckle: settings.vtracerFilterSpeckle,
      pathPrecision: settings.roundcoords > 0 ? settings.roundcoords : 2,
    },
    {
      invert: false,
      pathFill: '#000000',
      backgroundColor: undefined,
      attributes: undefined,
    }
  );

  converter.init();
  while (converter.tick()) { /* iterate until done */ }
  const svg = converter.getResult();
  converter.free();
  return svg;
}

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings): void {
  try {
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    // Apply blur before any tracing.
    const blurred = applyBlur(imageData, options.blurRadius);

    let optimized: string;

    if (options.mode === 'lineart') {
      const binary = binarizeOtsu(blurred);
      const svg = vectorizeLineart(binary, options);
      optimized = optimizeSvg(svg, {
        dropDefaultOpacity: true,
        coordDecimals: options.roundcoords,
        removeStroke: false,
      });
    } else {
      // ── Existing color pipeline ──
      const targetColors = Math.min(options.numberofcolors, 12);
      const effectivePathOmit =
        targetColors >= 10
          ? Math.min(options.pathomit, 10)
          : targetColors >= 7
            ? Math.min(options.pathomit, 16)
            : options.pathomit;

      const { imageData: tracedImageData, palette } = quantizeToDominantPalette(blurred, targetColors);

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
        desc: false,
        viewbox: true,
      });

      const withoutTransparent = removeTransparentPaths(svgString);
      const normalized = normalizeSvgPalette(withoutTransparent, targetColors >= 7 ? 18 : 32, targetColors);
      const withoutSpeckles = removeTinyPaths(normalized, Math.max(effectivePathOmit, targetColors >= 10 ? 8 : 16));
      const simplified = simplifySvgPaths(withoutSpeckles, 1.1, options.roundcoords);

      optimized = optimizeSvg(simplified, {
        dropDefaultOpacity: true,
        coordDecimals: options.roundcoords,
        removeStroke: true,
      });
    }

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
