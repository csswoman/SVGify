import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildIconTracePalette,
  ICON_VECTOR_PALETTE,
  iconTracePalette,
  isNearWhite,
  nearestIconPaletteColor,
  prepareIconSourceImage,
  quantizeImageToIconPalette,
  removeNearWhitePixels,
  removeNearWhiteSvgPaths,
  removeSmallSvgPathsByBounds,
  snapSvgToIconPalette,
} from './iconVectorization';

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

describe('icon vectorization helpers', () => {
  it('uses exactly the four icon colors', () => {
    expect(ICON_VECTOR_PALETTE).toEqual([
      { name: 'black', color: { r: 18, g: 18, b: 20 } },
      { name: 'cream', color: { r: 255, g: 246, b: 214 } },
      { name: 'pink', color: { r: 244, g: 105, b: 164 } },
      { name: 'shadow', color: { r: 150, g: 150, b: 146 } },
    ]);
  });

  it('snaps near-black, cream, pink, and gray colors to the icon palette', () => {
    expect(nearestIconPaletteColor({ r: 12, g: 13, b: 15 })).toEqual({ r: 18, g: 18, b: 20 });
    expect(nearestIconPaletteColor({ r: 253, g: 242, b: 205 })).toEqual({ r: 255, g: 246, b: 214 });
    expect(nearestIconPaletteColor({ r: 250, g: 118, b: 172 })).toEqual({ r: 244, g: 105, b: 164 });
    expect(nearestIconPaletteColor({ r: 142, g: 144, b: 143 })).toEqual({ r: 150, g: 150, b: 146 });
  });

  it('returns a copy of the nearest palette color', () => {
    const snapped = nearestIconPaletteColor({ r: 12, g: 13, b: 15 });

    snapped.r = 0;

    expect(ICON_VECTOR_PALETTE[0].color).toEqual({ r: 18, g: 18, b: 20 });
  });

  it('detects warm near-white colors without removing palette cream', () => {
    expect(isNearWhite({ r: 250, g: 248, b: 241 })).toBe(true);
    expect(isNearWhite({ r: 255, g: 246, b: 214 })).toBe(false);
  });

  it('removes near-white pixels without mutating input image data', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        250, 248, 241, 255,
        18, 18, 20, 255,
        255, 255, 255, 10,
      ]),
      3,
      1
    );

    const output = removeNearWhitePixels(input);

    expect([...input.data]).toEqual([
      250, 248, 241, 255,
      18, 18, 20, 255,
      255, 255, 255, 10,
    ]);
    expect([...output.data]).toEqual([
      250, 248, 241, 0,
      18, 18, 20, 255,
      255, 255, 255, 10,
    ]);
  });

  it('removes edge-connected off-white background before tracing icons', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        232, 232, 226, 255, 232, 232, 226, 255, 232, 232, 226, 255,
        232, 232, 226, 255, 255, 196, 20, 255, 232, 232, 226, 255,
        232, 232, 226, 255, 232, 232, 226, 255, 232, 232, 226, 255,
      ]),
      3,
      3
    );

    const output = prepareIconSourceImage(input);

    expect(output.data[3]).toBe(0);
    expect(output.data[4 * 4 + 3]).toBe(255);
    expect(output.data[4 * 4]).toBe(255);
  });

  it('quantizes visible pixels to icon palette colors without mutating input image data', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        11, 12, 13, 255,
        251, 114, 172, 255,
        254, 243, 210, 8,
      ]),
      3,
      1
    );

    const output = quantizeImageToIconPalette(input);

    expect([...input.data]).toEqual([
      11, 12, 13, 255,
      251, 114, 172, 255,
      254, 243, 210, 8,
    ]);
    expect([...output.data]).toEqual([
      18, 18, 20, 255,
      244, 105, 164, 255,
      254, 243, 210, 8,
    ]);
  });

  it('builds an icon palette that preserves a dominant blue accent', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        18, 18, 20, 255,
        18, 18, 20, 255,
        255, 246, 214, 255,
        38, 207, 255, 255,
        38, 207, 255, 255,
        38, 207, 255, 255,
      ]),
      6,
      1
    );

    const palette = buildIconTracePalette(input, 4);

    expect(palette).toContainEqual({ r: 18, g: 18, b: 20, a: 255 });
    expect(palette).toContainEqual({ r: 255, g: 246, b: 214, a: 255 });
    expect(palette).toContainEqual({ r: 38, g: 207, b: 255, a: 255 });
  });

  it('uses a dynamic icon palette when quantizing accent colors', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        38, 207, 255, 255,
        18, 18, 20, 255,
      ]),
      2,
      1
    );
    const palette = buildIconTracePalette(input, 4);

    const output = quantizeImageToIconPalette(input, palette);

    expect([...output.data]).toEqual([
      38, 207, 255, 255,
      18, 18, 20, 255,
    ]);
  });

  it('removes paths filled with white or near-white colors', () => {
    const svg = [
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(255,255,255)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(250,248,241)" d="M1 0L2 0Z"/>',
      '<path fill="rgb(18,18,20)" d="M2 0L3 0Z"/>',
      '</svg>',
    ].join('');

    const cleaned = removeNearWhiteSvgPaths(svg);

    expect(cleaned).not.toContain('rgb(255,255,255)');
    expect(cleaned).not.toContain('rgb(250,248,241)');
    expect(cleaned).toContain('rgb(18,18,20)');
  });

  it('snaps SVG fills and strokes to the icon palette', () => {
    const svg = [
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(11,12,13)" stroke="rgb(251,114,172)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(254,243,210)" d="M1 0L2 0Z"/>',
      '</svg>',
    ].join('');

    expect(snapSvgToIconPalette(svg)).toBe([
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(18,18,20)" stroke="rgb(244,105,164)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(255,246,214)" d="M1 0L2 0Z"/>',
      '</svg>',
    ].join(''));
  });

  it('snaps SVG fills to a dynamic icon palette accent', () => {
    const svg = '<svg><path fill="rgb(39,205,252)" d="M0 0L1 0Z"/></svg>';
    const palette = [{ r: 38, g: 207, b: 255, a: 255 }];

    expect(snapSvgToIconPalette(svg, palette)).toBe(
      '<svg><path fill="rgb(38,207,255)" d="M0 0L1 0Z"/></svg>'
    );
  });

  it('removes small SVG paths by bounding box area', () => {
    const svg = [
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(18,18,20)" d="M0 0L1 0L1 1Z"/>',
      '</svg>',
    ].join('');

    const cleaned = removeSmallSvgPathsByBounds(svg, 2);

    expect(cleaned).not.toContain('<path');
  });

  it('keeps large simple SVG paths and preserves attributes', () => {
    const largePath = '<path fill="rgb(18,18,20)" data-layer="main" d="M0 0L100 0L100 80L0 80Z"/>';
    const svg = `<svg viewBox="0 0 100 80">${largePath}</svg>`;

    expect(removeSmallSvgPathsByBounds(svg, 2)).toBe(svg);
  });

  it('returns the trace palette with full alpha', () => {
    expect(iconTracePalette()).toEqual([
      { r: 18, g: 18, b: 20, a: 255 },
      { r: 255, g: 246, b: 214, a: 255 },
      { r: 244, g: 105, b: 164, a: 255 },
      { r: 150, g: 150, b: 146, a: 255 },
    ]);
  });
});
