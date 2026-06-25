import { beforeAll, describe, expect, it } from 'vitest';
import {
  countPalettePixels,
  countColorOuterEdgePixels,
  createColorMask,
  downscaleForTrace,
  pickOuterBorderColor,
  smoothColorMask,
  traceIconByColorLayers,
} from './iconLayerTrace';

class TestImageData {
  readonly colorSpace: PredefinedColorSpace = 'srgb';
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

describe('icon layer trace helpers', () => {
  it('downscales large rasters before tracing', () => {
    const input = new ImageData(new Uint8ClampedArray(800 * 800 * 4), 800, 800);
    const output = downscaleForTrace(input, 720);

    expect(output.width).toBe(720);
    expect(output.height).toBe(720);
  });

  it('builds a mask for one palette color', () => {
    const cream = { r: 255, g: 246, b: 214 };
    const black = { r: 18, g: 18, b: 20 };
    const palette = [cream, black];
    const input = new ImageData(
      new Uint8ClampedArray([
        255, 246, 214, 255, 18, 18, 20, 255,
        18, 18, 20, 255, 255, 246, 214, 255,
      ]),
      2,
      2
    );

    const mask = createColorMask(input, cream, palette);

    expect(countPalettePixels(input, cream, palette)).toBe(2);
    expect(mask.data[0]).toBe(255);
    expect(mask.data[3]).toBe(255);
    expect(mask.data[4]).toBe(0);
    expect(mask.data[7]).toBe(0);
  });

  it('matches softened pixels to the nearest palette color in masks', () => {
    const cream = { r: 255, g: 246, b: 214 };
    const palette = [cream];
    const input = new ImageData(new Uint8ClampedArray([254, 245, 213, 255]), 1, 1);
    const mask = createColorMask(input, cream, palette);

    expect(mask.data[3]).toBe(255);
  });

  it('keeps transparent mask pixels in the transparent palette color', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        255, 255, 255, 255,
        255, 255, 255, 0,
      ]),
      2,
      1
    );

    const output = smoothColorMask(input, 0);

    expect([...output.data.slice(4, 8)]).toEqual([0, 0, 0, 0]);
  });

  it('detects the palette color that touches transparency', () => {
    const cream = { r: 255, g: 246, b: 214 };
    const purple = { r: 120, g: 60, b: 200 };
    const transparent = [0, 0, 0, 0];
    const c = [255, 246, 214, 255];
    const p = [120, 60, 200, 255];
    const input = new ImageData(
      new Uint8ClampedArray([
        ...transparent, ...c, ...c, ...transparent,
        ...c, ...p, ...p, ...c,
        ...transparent, ...c, ...c, ...transparent,
      ]),
      4,
      3
    );

    expect(pickOuterBorderColor(input, [cream, purple])).toEqual(cream);
    expect(countColorOuterEdgePixels(input, cream, [cream, purple])).toBeGreaterThan(0);
    expect(countColorOuterEdgePixels(input, purple, [cream, purple])).toBe(0);
  });

  it('does not recolor transparent layer backgrounds as visible rectangles', () => {
    const yellow = { r: 255, g: 196, b: 20 };
    const black = { r: 18, g: 18, b: 20 };
    const transparent = [0, 0, 0, 0];
    const y = [255, 196, 20, 255];
    const k = [18, 18, 20, 255];
    const input = new ImageData(
      new Uint8ClampedArray([
        ...transparent, ...transparent, ...transparent, ...transparent,
        ...transparent, ...k, ...k, ...transparent,
        ...transparent, ...k, ...y, ...transparent,
        ...transparent, ...transparent, ...transparent, ...transparent,
      ]),
      4,
      4
    );

    const svg = traceIconByColorLayers(input, [yellow, black], {
      numberofcolors: 2,
      ltres: 2,
      qtres: 2,
      strokewidth: 1,
      scale: 1,
      pathomit: 0,
      roundcoords: 1,
      blurRadius: 0,
    });

    expect(svg).not.toContain('M0 0H4V4H0');
    expect(svg).toContain('fill="rgb(255,196,20)"');
    expect(svg).toContain('fill="rgb(18,18,20)"');
  });
});
