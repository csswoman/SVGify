import { beforeAll, describe, expect, it } from 'vitest';
import {
  applyAlphaMask,
  hardenIconAlpha,
  mergeSimilarPaletteColors,
  nearestPaletteColor,
  pickDarkOutlineColorFromImage,
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

  it('suggests the dominant gray drop-shadow color from the raster', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        182, 182, 182, 255,
        182, 182, 182, 255,
        18, 18, 20, 255,
        255, 246, 214, 255,
      ]),
      4,
      1
    );

    const palette = suggestPaletteFromImage(input, 5);

    expect(palette).toContainEqual({ r: 182, g: 182, b: 182, a: 255 });
  });

  it('keeps gray drop shadows out of black when quantizing', () => {
    const palette = [
      { r: 18, g: 18, b: 20 },
      { r: 182, g: 182, b: 182 },
      { r: 255, g: 246, b: 214 },
    ];
    const input = new ImageData(
      new Uint8ClampedArray([
        176, 176, 176, 255,
        18, 18, 20, 255,
      ]),
      2,
      1
    );

    const output = quantizeImageToPalette(input, palette);

    expect([...output.data.slice(0, 4)]).toEqual([182, 182, 182, 255]);
    expect([...output.data.slice(4, 8)]).toEqual([18, 18, 20, 255]);
  });

  it('keeps dark saturated colors separate from black in the suggested palette', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        4, 18, 38, 255,
        4, 18, 38, 255,
        18, 18, 20, 255,
        198, 176, 128, 255,
      ]),
      4,
      1
    );

    const palette = suggestPaletteFromImage(input, 6);

    expect(palette).toContainEqual({ r: 4, g: 18, b: 38, a: 255 });
    expect(palette).toContainEqual({ r: 18, g: 18, b: 20, a: 255 });
  });

  it('returns a richer palette when the requested color count is high', () => {
    const pixels: number[] = [];
    const colors = [
      [8, 18, 38],
      [18, 18, 20],
      [42, 72, 126],
      [76, 154, 202],
      [196, 166, 112],
      [180, 128, 90],
      [126, 88, 52],
      [214, 190, 126],
      [204, 142, 122],
      [112, 160, 154],
      [154, 138, 112],
      [88, 66, 44],
    ];

    for (const [r, g, b] of colors) {
      pixels.push(r, g, b, 255, r, g, b, 255);
    }

    const palette = suggestPaletteFromImage(
      new ImageData(new Uint8ClampedArray(pixels), colors.length * 2, 1),
      18
    );

    expect(palette.length).toBeGreaterThanOrEqual(10);
  });

  it('collapses dark outline variants even when the requested color count is high', () => {
    const pixels: number[] = [];
    const colors = [
      [74, 49, 26],
      [83, 58, 31],
      [69, 42, 20],
      [4, 18, 38],
      [0, 0, 0],
      [255, 246, 214],
      [198, 176, 128],
    ];

    for (const [r, g, b] of colors) {
      pixels.push(r, g, b, 255, r, g, b, 255, r, g, b, 255);
    }

    const palette = suggestPaletteFromImage(
      new ImageData(new Uint8ClampedArray(pixels), colors.length * 3, 1),
      18
    );
    const outlineLike = palette.filter((color) => {
      const light = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
      const sat = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
      return light >= 30 && light <= 118 && sat >= 18;
    });

    expect(outlineLike).toHaveLength(1);
    expect(palette).toContainEqual({ r: 4, g: 18, b: 38, a: 255 });
    expect(palette).toContainEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it('keeps a dark navy outline as a fixed palette entry instead of folding it into brown', () => {
    const navy = [4, 18, 38, 255];
    const brown = [74, 49, 26, 255];
    const black = [18, 18, 20, 255];
    const cream = [255, 246, 214, 255];
    const pixels = [
      ...navy, ...navy, ...navy, ...brown,
      ...navy, ...cream, ...cream, ...brown,
      ...navy, ...cream, ...black, ...brown,
      ...navy, ...navy, ...navy, ...brown,
    ];
    const image = new ImageData(new Uint8ClampedArray(pixels), 4, 4);

    const outline = pickDarkOutlineColorFromImage(image);
    const palette = suggestPaletteFromImage(image, 32, 6);
    const snapped = nearestPaletteColor({ r: 7, g: 19, b: 39 }, palette);

    expect(outline).toEqual({ r: 4, g: 18, b: 38 });
    expect(palette).toContainEqual({ r: 4, g: 18, b: 38, a: 255 });
    expect(snapped).toEqual({ r: 4, g: 18, b: 38, a: 255 });
  });

  it('preserves soft gray shadow alpha when applying the silhouette mask', () => {
    const color = new ImageData(
      new Uint8ClampedArray([
        180, 180, 180, 96,
        255, 246, 214, 255,
      ]),
      2,
      1
    );
    const mask = new ImageData(
      new Uint8ClampedArray([
        180, 180, 180, 0,
        255, 246, 214, 255,
      ]),
      2,
      1
    );

    const output = applyAlphaMask(color, mask);

    expect(output.data[3]).toBe(255);
    expect(output.data[7]).toBe(255);
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
