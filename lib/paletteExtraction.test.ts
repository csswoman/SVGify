import { beforeAll, describe, expect, it } from 'vitest';
import {
  absorbSmallPaletteComponents,
  applyAlphaMask,
  hardenIconAlpha,
  mergeSimilarPaletteColors,
  nearestPaletteColor,
  pickDarkOutlineColorFromImage,
  quantizeImageToPalette,
  removeNearWhitePixels,
  smoothQuantizedPalette,
  suggestFlatIconPaletteFromImage,
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
  it('absorbs tiny palette islands into an existing neighboring color', () => {
    const teal = [37, 185, 181, 255];
    const beige = [224, 205, 164, 255];
    const pixels = Array.from({ length: 25 }, () => teal.slice());
    pixels[12] = beige;
    const input = new ImageData(new Uint8ClampedArray(pixels.flat()), 5, 5);

    const cleaned = absorbSmallPaletteComponents(input, 4);

    expect([...cleaned.data.slice(12 * 4, 12 * 4 + 4)]).toEqual(teal);
  });

  it('preserves a detached small accent surrounded only by transparency', () => {
    const pixels = Array.from({ length: 9 }, () => [0, 0, 0, 0]);
    pixels[4] = [246, 196, 52, 255];
    const input = new ImageData(new Uint8ClampedArray(pixels.flat()), 3, 3);

    const cleaned = absorbSmallPaletteComponents(input, 4);

    expect([...cleaned.data.slice(4 * 4, 4 * 4 + 4)]).toEqual([246, 196, 52, 255]);
  });

  it('preserves a small transition shade between two real color regions', () => {
    const teal = [37, 185, 181, 255];
    const transition = [116, 139, 108, 255];
    const brown = [129, 83, 48, 255];
    const input = new ImageData(
      new Uint8ClampedArray([...teal, ...transition, ...brown]),
      3,
      1
    );

    const cleaned = absorbSmallPaletteComponents(input, 8);

    expect([...cleaned.data.slice(4, 8)]).toEqual(transition);
  });

  it('preserves small contour shades that touch transparency', () => {
    const transparent = [0, 0, 0, 0];
    const contour = [92, 65, 43, 255];
    const cream = [248, 232, 195, 255];
    const input = new ImageData(
      new Uint8ClampedArray([...transparent, ...contour, ...cream]),
      3,
      1
    );

    const cleaned = absorbSmallPaletteComponents(input, 8);

    expect([...cleaned.data.slice(4, 8)]).toEqual(contour);
  });

  it('keeps smaller Standard palettes as stable anchors when colors increase', () => {
    const colors = [
      [18, 24, 32, 255],
      [244, 224, 180, 255],
      [37, 185, 181, 255],
      [129, 83, 48, 255],
      [246, 196, 52, 255],
      [238, 164, 176, 255],
      [91, 122, 158, 255],
      [181, 151, 97, 255],
    ];
    const pixels = colors.flatMap((color, index) =>
      Array.from({ length: 20 - index }, () => color).flat()
    );
    const input = new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1);

    const four = suggestPaletteFromImage(input, 4);
    const eight = suggestPaletteFromImage(input, 8);

    expect(eight.slice(0, four.length)).toEqual(four);
  });

  it('ignores colors that exist only in mostly transparent antialias pixels', () => {
    const pixels = [
      ...Array.from({ length: 20 }, () => [37, 185, 181, 255]).flat(),
      ...Array.from({ length: 8 }, () => [224, 205, 164, 180]).flat(),
      ...Array.from({ length: 20 }, () => [129, 83, 48, 255]).flat(),
    ];
    const input = new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1);

    const palette = suggestPaletteFromImage(input, 8);

    expect(palette).not.toContainEqual({ r: 224, g: 205, b: 164, a: 255 });
  });

  it('does not promote unsupported internal antialias colors into the palette', () => {
    const blue = [32, 92, 178, 255];
    const orange = [218, 92, 36, 255];
    const transitionRows = Array.from({ length: 33 }, (_, index) => [
      88 + (index % 8) * 8,
      120 + Math.floor(index / 8) * 8,
      176 - index * 2,
      255,
    ]);
    const pixels: number[] = [];

    for (let y = 0; y < transitionRows.length; y++) {
      for (let x = 0; x < 65; x++) {
        pixels.push(...(x < 32 ? blue : x === 32 ? transitionRows[y] : orange));
      }
    }

    const input = new ImageData(new Uint8ClampedArray(pixels), 65, transitionRows.length);
    const palette = suggestPaletteFromImage(input, 8, 6);
    const sourceColors = new Set<string>();
    for (let i = 0; i < input.data.length; i += 4) {
      sourceColors.add(`${input.data[i]},${input.data[i + 1]},${input.data[i + 2]}`);
    }

    expect(palette).toContainEqual({ r: 32, g: 92, b: 178, a: 255 });
    expect(palette).toContainEqual({ r: 218, g: 92, b: 36, a: 255 });
    expect(palette.every((color) => sourceColors.has(`${color.r},${color.g},${color.b}`))).toBe(true);
    for (const transition of transitionRows) {
      expect(palette).not.toContainEqual({
        r: transition[0],
        g: transition[1],
        b: transition[2],
        a: 255,
      });
    }
  });

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

  it('removes a thin gray antialias ring without erasing solid gray artwork', () => {
    const background = [10, 17, 28, 255];
    const gray = [43, 48, 55, 255];
    const yellow = [243, 188, 36, 255];
    const palette = [
      { r: 10, g: 17, b: 28 },
      { r: 43, g: 48, b: 55 },
      { r: 243, g: 188, b: 36 },
    ];
    const ringPixels: number[] = [];
    for (let y = 0; y < 9; y++) {
      const color = y <= 2 ? background : y <= 4 ? gray : yellow;
      for (let x = 0; x < 9; x++) ringPixels.push(...color);
    }
    const ring = new ImageData(new Uint8ClampedArray(ringPixels), 9, 9);
    const solid = new ImageData(
      new Uint8ClampedArray(Array.from({ length: 81 }, () => gray).flat()),
      9,
      9
    );

    const cleanedRing = smoothQuantizedPalette(ring, palette, 1);
    const cleanedSolid = smoothQuantizedPalette(solid, palette, 1);

    const transitionPixel = (3 * 9 + 4) * 4;
    const solidCenter = (4 * 9 + 4) * 4;
    expect([...cleanedRing.data.slice(transitionPixel, transitionPixel + 4)]).not.toEqual(gray);
    expect([...cleanedSolid.data.slice(solidCenter, solidCenter + 4)]).toEqual(gray);
  });

  it('prioritizes distinct flat icon colors over duplicate dark variants', () => {
    const navy = [5, 24, 72, 255];
    const darkAa = [4, 8, 18, 255];
    const white = [255, 255, 255, 255];
    const yellow = [246, 197, 38, 255];
    const pixels: number[] = [];

    for (let i = 0; i < 18; i++) pixels.push(...navy);
    for (let i = 0; i < 2; i++) pixels.push(...darkAa);
    for (let i = 0; i < 10; i++) pixels.push(...white);
    for (let i = 0; i < 8; i++) pixels.push(...yellow);

    const palette = suggestFlatIconPaletteFromImage(
      new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1),
      4
    );

    expect(palette).toContainEqual({ r: 5, g: 24, b: 72, a: 255 });
    expect(palette).toContainEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(palette).toContainEqual({ r: 246, g: 197, b: 38, a: 255 });
    expect(palette).not.toContainEqual({ r: 4, g: 8, b: 18, a: 255 });
  });

  it('keeps a small saturated third icon color in the flat icon palette', () => {
    const navy = [5, 24, 72, 255];
    const white = [255, 255, 255, 255];
    const yellow = [246, 197, 38, 255];
    const pixels: number[] = [];

    for (let i = 0; i < 120; i++) pixels.push(...navy);
    for (let i = 0; i < 64; i++) pixels.push(...white);
    for (let i = 0; i < 3; i++) pixels.push(...yellow);

    const palette = suggestFlatIconPaletteFromImage(
      new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1),
      4
    );

    expect(palette).toContainEqual({ r: 5, g: 24, b: 72, a: 255 });
    expect(palette).toContainEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(palette).toContainEqual({ r: 246, g: 197, b: 38, a: 255 });
  });

  it('does not dull a saturated icon accent with darker edge pixels', () => {
    const background = [10, 17, 28, 255];
    const yellow = [243, 188, 36, 255];
    const yellowEdge = [165, 132, 55, 255];
    const gray = [43, 48, 55, 255];
    const pixels: number[] = [];

    for (let i = 0; i < 160; i++) pixels.push(...background);
    for (let i = 0; i < 40; i++) pixels.push(...yellow);
    for (let i = 0; i < 20; i++) pixels.push(...yellowEdge);
    for (let i = 0; i < 35; i++) pixels.push(...gray);

    const palette = suggestFlatIconPaletteFromImage(
      new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1),
      8,
      6
    );

    expect(palette).toContainEqual({ r: 243, g: 188, b: 36, a: 255 });
  });

  it('normalizes an off-white icon letter to white instead of a gray shadow', () => {
    const navy = [9, 18, 30, 255];
    const offWhite = [232, 232, 233, 255];
    const gray = [151, 155, 160, 255];
    const yellow = [246, 197, 38, 255];
    const pixels: number[] = [];

    for (let i = 0; i < 180; i++) pixels.push(...navy);
    for (let i = 0; i < 64; i++) pixels.push(...offWhite);
    for (let i = 0; i < 80; i++) pixels.push(...gray);
    for (let i = 0; i < 12; i++) pixels.push(...yellow);

    const input = new ImageData(new Uint8ClampedArray(pixels), pixels.length / 4, 1);
    const palette = suggestFlatIconPaletteFromImage(input, 3);
    const quantized = quantizeImageToPalette(
      new ImageData(new Uint8ClampedArray(offWhite), 1, 1),
      palette
    );

    expect(palette).toContainEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect([...quantized.data]).toEqual([255, 255, 255, 255]);
  });
});
