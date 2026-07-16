import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  ColorMode,
  Hierarchical,
  PathSimplifyMode,
  vectorizeRaw,
} from '@neplex/vectorizer';
import { removeBackground } from './backgroundRemoval';
import {
  absorbSmallPaletteComponents,
  quantizeImageToPalette,
  recoverOpaqueMattePaletteFringes,
  smoothQuantizedPalette,
  suggestFlatIconPaletteFromImage,
} from './paletteExtraction';
import {
  anchorAntialiasedEdgeColors,
  applyAlphaThreshold,
  morphCloseAlpha,
  upscaleImageDataSmooth,
} from './imageFilters';
import {
  paletteForTrace,
  resolveIconPaletteSmoothing,
  resolveIconPreprocessingScale,
  resolveMatteFilterSpeckle,
  resolveMatteRasterSpeckleArea,
} from './iconModeSettings';
import { applyVectorizeProfile } from './vectorizeProfiles';
import { finalizeTracedSvg } from './finalizeTracedSvg';
import { VECTORIZE_DEFAULTS, type VectorizeSettings } from '../types/svg.types';

class TestImageData {
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

beforeAll(() => {
  if (typeof ImageData === 'undefined') {
    Object.defineProperty(globalThis, 'ImageData', { value: TestImageData });
  }
});

/** Mirrors the worker icon profile used after opaque-matte background removal. */
function preprocessIconAfterMatte(imageData: ImageData, settings: VectorizeSettings): ImageData {
  const preprocessingScale = resolveIconPreprocessingScale(
    settings.preprocessingScale,
    imageData.width,
    imageData.height
  );
  const upscaled = upscaleImageDataSmooth(imageData, preprocessingScale);
  const edgeAnchored = anchorAntialiasedEdgeColors(upscaled, settings.alphaThreshold);
  const alphaCleaned = applyAlphaThreshold(edgeAnchored, settings.alphaThreshold);
  const palette = paletteForTrace(settings);
  const quantized = quantizeImageToPalette(alphaCleaned, palette);
  const smoothingRadius = resolveIconPaletteSmoothing(
    settings.bilateralRadius,
    alphaCleaned.width,
    alphaCleaned.height
  );
  const smoothed = smoothQuantizedPalette(quantized, palette, smoothingRadius);
  const fringeFixed = recoverOpaqueMattePaletteFringes(smoothed, palette);
  const closed = morphCloseAlpha(fringeFixed, 1);
  const minComponentArea = resolveMatteRasterSpeckleArea(
    settings.filterSpeckle,
    closed.width,
    closed.height
  );
  return absorbSmallPaletteComponents(closed, minComponentArea);
}

async function loadJpegUpload(): Promise<ImageData> {
  const fixture = await readFile(join(process.cwd(), 'public', 'svgify.svg'));
  const jpeg = await sharp(fixture).resize(512, 463).jpeg({ quality: 80 }).toBuffer();
  const decoded = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return new ImageData(
    new Uint8ClampedArray(decoded.data),
    decoded.info.width,
    decoded.info.height
  );
}

describe('svgify icon background removal', () => {
  it('recovers clean stroke frame paths from a jpeg-compressed upload after matte removal', async () => {
    const source = await loadJpegUpload();
    const cleaned = removeBackground(source, {
      tolerance: 48,
      contiguous: true,
      matteCoreToleranceCap: 12,
      matteFringeDepth: 6,
      matteHueGuard: true,
    });

    expect(cleaned.data[3]).toBe(0);

    const palette = suggestFlatIconPaletteFromImage(cleaned, 8, 6).map(({ r, g, b }) => ({
      r,
      g,
      b,
    }));
    const settings: VectorizeSettings = {
      ...applyVectorizeProfile({
        ...VECTORIZE_DEFAULTS,
        traceMode: 'icon',
        detailLevel: 'balanced',
        colorPrecision: 3,
        numberofcolors: 8,
      }),
      customPalette: palette,
      matteReconstructed: true,
      filterSpeckle: resolveMatteFilterSpeckle(4),
    };

    const preprocessed = preprocessIconAfterMatte(cleaned, settings);
    expect(preprocessed.width).toBeGreaterThan(source.width);

    const raw = await vectorizeRaw(
      Buffer.from(preprocessed.data),
      { width: preprocessed.width, height: preprocessed.height },
      {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Cutout,
        mode: PathSimplifyMode.Polygon,
        colorPrecision: 8,
        filterSpeckle: settings.filterSpeckle,
        cornerThreshold: settings.cornerThreshold,
        pathPrecision: settings.pathPrecision,
        layerDifference: settings.layerDifference,
        lengthThreshold: settings.lengthThreshold,
        maxIterations: settings.maxIterations,
        spliceThreshold: settings.spliceThreshold,
        smallCircle: 16,
      }
    );
    const svg = finalizeTracedSvg(raw, settings);
    const pathCount = (svg.match(/<path\b/g) ?? []).length;
    const strokeCount = (svg.match(/fill="none"/g) ?? []).length;

    // Without matte cleanup, jpeg uploads produced ~64 jagged fills and zero
    // strokes because regularization bailed out past its path budget.
    expect(strokeCount).toBeGreaterThanOrEqual(2);
    expect(pathCount).toBeLessThan(40);
    expect(svg).toMatch(/stroke="#fff"|stroke="rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)"/i);
    // Solid fills such as the sun should rebuild as arcs, not noisy polygons.
    expect(svg).toMatch(/A[\d.]+ [\d.]+ 0 1 1/);

    // The yellow-over-black matte edge collapses into a dark olive shade. It must
    // be folded back into the bright accent, never survive as its own dark warm
    // fill (the "big residue" hugging the cable/star the user reported).
    const fills = [...svg.matchAll(/fill="#([0-9a-f]{6})"/gi)].map((m) => m[1]);
    const darkWarmResidue = fills.filter((hex) => {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance < 80 && r - b > 24 && g - b > 8;
    });
    expect(darkWarmResidue).toHaveLength(0);
  }, 90_000);
});
