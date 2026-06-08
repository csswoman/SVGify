import { beforeAll, describe, expect, it } from 'vitest';
import {
  applyAlphaMask,
  hardenIconAlpha,
  mergeSimilarPaletteColors,
  quantizeImageToPalette,
  removeNearWhitePixels,
  smoothQuantizedPalette,
  snapSvgToPalette,
  suggestPaletteFromImage,
} from './paletteExtraction';

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

describe('palette extraction', () => {
  it('suggests a clean palette from visible raster colors and removes near-white background first', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        255, 255, 255, 255,
        18, 18, 20, 255,
        255, 246, 214, 255,
        38, 207, 255, 255,
        38, 207, 255, 255,
        150, 150, 146, 255,
      ]),
      6,
      1
    );

    const palette = suggestPaletteFromImage(removeNearWhitePixels(input), 4);

    expect(palette).toContainEqual({ r: 18, g: 18, b: 20, a: 255 });
    expect(palette).toContainEqual({ r: 255, g: 246, b: 214, a: 255 });
    expect(palette).toContainEqual({ r: 38, g: 207, b: 255, a: 255 });
    expect(palette).not.toContainEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it('uses the edited palette exactly when quantizing and snapping SVG colors', () => {
    const editedPalette = [
      { r: 20, g: 20, b: 24 },
      { r: 70, g: 190, b: 255 },
    ];
    const input = new ImageData(
      new Uint8ClampedArray([
        15, 16, 19, 255,
        38, 207, 255, 255,
      ]),
      2,
      1
    );

    const quantized = quantizeImageToPalette(input, editedPalette);
    const snapped = snapSvgToPalette(
      '<svg><path fill="rgb(38,207,255)" d="M0 0L1 0Z"/></svg>',
      editedPalette
    );

    expect([...quantized.data]).toEqual([
      20, 20, 24, 255,
      70, 190, 255, 255,
    ]);
    expect(snapped).toBe('<svg><path fill="rgb(70,190,255)" d="M0 0L1 0Z"/></svg>');
  });

  it('hardens soft alpha edges so the tracer receives a crisp icon silhouette', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        18, 18, 20, 20,
        18, 18, 20, 128,
        18, 18, 20, 220,
      ]),
      3,
      1
    );

    const output = hardenIconAlpha(input, 160);

    expect([...output.data]).toEqual([
      18, 18, 20, 0,
      18, 18, 20, 0,
      18, 18, 20, 255,
    ]);
    expect([...input.data]).toEqual([
      18, 18, 20, 20,
      18, 18, 20, 128,
      18, 18, 20, 220,
    ]);
  });

  it('keeps crisp quantized colors but takes the silhouette alpha from the mask', () => {
    const color = new ImageData(
      new Uint8ClampedArray([
        18, 18, 20, 255,
        244, 105, 164, 255,
      ]),
      2,
      1
    );
    const mask = new ImageData(
      new Uint8ClampedArray([
        18, 18, 20, 0,
        244, 105, 164, 255,
      ]),
      2,
      1
    );

    const output = applyAlphaMask(color, mask);

    expect([...output.data]).toEqual([
      18, 18, 20, 0,
      244, 105, 164, 255,
    ]);
    expect([...color.data]).toEqual([
      18, 18, 20, 255,
      244, 105, 164, 255,
    ]);
  });

  it('merges near-duplicate palette entries before tracing', () => {
    const merged = mergeSimilarPaletteColors([
      { r: 163, g: 116, b: 212 },
      { r: 170, g: 120, b: 215 },
      { r: 18, g: 18, b: 20 },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1]).toEqual({ r: 18, g: 18, b: 20 });
  });

  it('smooths isolated boundary pixels to the surrounding palette color', () => {
    const palette = [
      { r: 255, g: 246, b: 214 },
      { r: 163, g: 116, b: 212 },
    ];
    const input = new ImageData(
      new Uint8ClampedArray([
        255, 246, 214, 255, 255, 246, 214, 255, 255, 246, 214, 255,
        255, 246, 214, 255, 163, 116, 212, 255, 255, 246, 214, 255,
        255, 246, 214, 255, 255, 246, 214, 255, 255, 246, 214, 255,
      ]),
      3,
      3
    );

    const output = smoothQuantizedPalette(input, palette, 2);

    expect(output.data[16]).toBe(255);
    expect(output.data[17]).toBe(246);
    expect(output.data[18]).toBe(214);
  });
});
