import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorizeRaw } from '@neplex/vectorizer';
import { removeBackground } from './backgroundRemoval';
import { finalizeTracedSvg } from './finalizeTracedSvg';
import { ICON_MODE_SETTINGS, resolveTraceColorPrecision, resolveTraceSmallCircle } from './iconModeSettings';
import {
  quantizeImageToPalette,
  smoothQuantizedPalette,
  suggestFlatIconPaletteFromImage,
} from './paletteExtraction';
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

// Exact user-reported WebP regression fixture, embedded so the test is portable.
const LOGO_WEBP = Buffer.from(
  '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',
  'base64'
);

function hasLightPinkFill(svg: string): boolean {
  return [...svg.matchAll(/fill="([^"]+)"/gi)].some((m) => {
    const value = m[1].toLowerCase();
    const rgb = value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    const hex = value.match(/^#([0-9a-f]{6})$/);
    let r = 0;
    let g = 0;
    let b = 0;
    if (rgb) {
      r = Number(rgb[1]);
      g = Number(rgb[2]);
      b = Number(rgb[3]);
    } else if (hex) {
      r = parseInt(hex[1].slice(0, 2), 16);
      g = parseInt(hex[1].slice(2, 4), 16);
      b = parseInt(hex[1].slice(4, 6), 16);
    } else {
      return false;
    }
    return r >= 230 && g >= 140 && g <= 210 && b >= 190;
  });
}

describe('finalizeTracedSvg icon light fills', () => {
  it('joins compatible neighboring Standard fragments without changing colors', () => {
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'standard',
      numberofcolors: 2,
      customPalette: [{ r: 37, g: 185, b: 181 }],
    };
    const rawSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">',
      '<path fill="rgb(37,185,181)" d="M0 0H4V4H0Z"/>',
      '<path fill="rgb(37,185,181)" d="M6 0H10V4H6Z"/>',
      '</svg>',
    ].join('');

    const svg = finalizeTracedSvg(rawSvg, settings);

    expect((svg.match(/<path\b/g) ?? [])).toHaveLength(1);
    expect(svg).toContain('#25b9b5');
  });

  it('preserves transparent cutouts inside Standard compound paths', async () => {
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'standard',
      numberofcolors: 2,
      customPalette: [{ r: 139, g: 90, b: 43 }],
    };
    const rawSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">',
      '<path fill="rgb(139,90,43)" fill-rule="evenodd" ',
      'd="M0 0H10V10H0ZM3 3H7V7H3Z"/>',
      '</svg>',
    ].join('');

    const svg = finalizeTracedSvg(rawSvg, settings);

    expect((svg.match(/<path\b/g) ?? [])).toHaveLength(1);
    expect(svg).toContain('fill-rule="evenodd"');

    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const filled = (1 * info.width + 1) * 4;
    const cutout = (5 * info.width + 5) * 4;
    expect([...data.subarray(filled, filled + 4)]).toEqual([139, 90, 43, 255]);
    expect(data[cutout + 3]).toBe(0);
  });

  it('keeps distinct approved Standard colors instead of merging them', () => {
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'standard',
      numberofcolors: 4,
      paletteMergeThreshold: 128,
      customPalette: [
        { r: 90, g: 190, b: 175 },
        { r: 122, g: 208, b: 192 },
      ],
    };
    const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><path fill="rgb(91,189,174)" d="M0 0h1v1H0z"/><path fill="rgb(121,207,191)" d="M1 0h1v1H1z"/></svg>';

    const svg = finalizeTracedSvg(rawSvg, settings);

    expect(svg).toContain('#5abeaf');
    expect(svg).toContain('#7ad0c0');
  });

  it('preserves the light pink circle fill for the EN logo after icon+removeBg', async () => {
    const { data, info } = await sharp(LOGO_WEBP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const image = new ImageData(new Uint8ClampedArray(data), info.width, info.height);
    const withoutBg = removeBackground(image, { tolerance: 48, contiguous: true });
    const palette = suggestFlatIconPaletteFromImage(
      withoutBg,
      ICON_MODE_SETTINGS.numberofcolors,
      6
    ).map(({ r, g, b }) => ({ r, g, b }));

    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      ...ICON_MODE_SETTINGS,
      traceMode: 'icon',
      customPalette: palette,
    };

    const quantized = smoothQuantizedPalette(
      quantizeImageToPalette(withoutBg, palette),
      palette,
      settings.bilateralRadius
    );
    const quantizedSample = (20 * quantized.width + 64) * 4;
    expect([...quantized.data.subarray(quantizedSample, quantizedSample + 4)]).toEqual([
      255, 175, 220, 255,
    ]);

    const rawSvg = await vectorizeRaw(
      Buffer.from(quantized.data),
      { width: quantized.width, height: quantized.height },
      {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        mode: PathSimplifyMode.Polygon,
        colorPrecision: resolveTraceColorPrecision(settings),
        filterSpeckle: settings.filterSpeckle,
        cornerThreshold: settings.cornerThreshold,
        pathPrecision: settings.pathPrecision,
        layerDifference: settings.layerDifference,
        lengthThreshold: settings.lengthThreshold,
        maxIterations: settings.maxIterations,
        spliceThreshold: settings.spliceThreshold,
        smallCircle: resolveTraceSmallCircle(settings.traceMode),
      }
    );

    const { data: rawRendered, info: rawRenderedInfo } = await sharp(Buffer.from(rawSvg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rawSample = (20 * rawRenderedInfo.width + 64) * 4;
    expect([...rawRendered.subarray(rawSample, rawSample + 4)]).toEqual([254, 174, 219, 255]);

    const svg = finalizeTracedSvg(rawSvg, settings);
    expect(hasLightPinkFill(svg)).toBe(true);
    expect(svg).toMatch(/stroke-width="(?:0?\.5)"/);
    expect(svg).toContain('clipPath id="svgcraft-logo-inner-boundary"');
    expect(svg).toMatch(/M[\d.]+ 89H[\d.]+Q[\d.]+ 89 [\d.]+ [\d.]+Q[\d.]+ [\d.]+ [\d.]+ [\d.]+H[\d.]+Q/);

    const { data: rendered, info: renderedInfo } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const sample = (20 * renderedInfo.width + 64) * 4;
    expect([...rendered.subarray(sample, sample + 4)]).toEqual([255, 175, 220, 255]);

    // Guard the overall geometry as well as the palette. This catches spline
    // over-smoothing that bows straight logo edges and detaches small details.
    let visibleRgbError = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128 || rendered[i + 3] < 128) continue;
      visibleRgbError +=
        Math.abs(data[i] - rendered[i]) +
        Math.abs(data[i + 1] - rendered[i + 1]) +
        Math.abs(data[i + 2] - rendered[i + 2]);
    }
    // Exact circular reconstruction moves more antialiased edge pixels than
    // polygon cleanup while remaining close to the source palette and layout.
    expect(visibleRgbError).toBeLessThan(300_000);
  });

  it('preserves pink even with legacy icon presets (precision 2, merge 64)', async () => {
    const { data, info } = await sharp(LOGO_WEBP).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const image = new ImageData(new Uint8ClampedArray(data), info.width, info.height);
    const withoutBg = removeBackground(image, { tolerance: 48, contiguous: true });
    const palette = suggestFlatIconPaletteFromImage(withoutBg, 4, 6).map(({ r, g, b }) => ({
      r,
      g,
      b,
    }));

    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'icon',
      colorPrecision: 2,
      numberofcolors: 4,
      paletteMergeThreshold: 64,
      filterSpeckle: 8,
      cornerThreshold: 95,
      pathPrecision: 1,
      layerDifference: 18,
      lengthThreshold: 10,
      maxIterations: 3,
      spliceThreshold: 75,
      customPalette: palette,
    };

    const quantized = smoothQuantizedPalette(
      quantizeImageToPalette(withoutBg, palette),
      palette,
      1
    );

    const rawSvg = await vectorizeRaw(
      Buffer.from(quantized.data),
      { width: quantized.width, height: quantized.height },
      {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        mode: PathSimplifyMode.Polygon,
        colorPrecision: resolveTraceColorPrecision(settings),
        filterSpeckle: settings.filterSpeckle,
        cornerThreshold: settings.cornerThreshold,
        pathPrecision: settings.pathPrecision,
        layerDifference: settings.layerDifference,
        lengthThreshold: settings.lengthThreshold,
        maxIterations: settings.maxIterations,
        spliceThreshold: settings.spliceThreshold,
        smallCircle: resolveTraceSmallCircle(settings.traceMode),
      }
    );

    const svg = finalizeTracedSvg(rawSvg, settings);
    expect(hasLightPinkFill(svg)).toBe(true);
  });
});
