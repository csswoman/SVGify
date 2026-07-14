import { describe, expect, it } from 'vitest';
import { anchorAntialiasedEdgeColors, applyAlphaThreshold } from './imageFilters';

class TestImageData {
  readonly colorSpace: PredefinedColorSpace = 'srgb';
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

if (typeof ImageData === 'undefined') {
  Object.defineProperty(globalThis, 'ImageData', { value: TestImageData });
}

describe('applyAlphaThreshold', () => {
  it('drops translucent fringe pixels and keeps opaque pixels', () => {
    const input = new ImageData(
      new Uint8ClampedArray([
        255, 255, 255, 80,
        240, 220, 180, 220,
      ]),
      2,
      1
    );

    const output = applyAlphaThreshold(input, 160);

    expect([...output.data.slice(0, 4)]).toEqual([0, 0, 0, 0]);
    expect([...output.data.slice(4, 8)]).toEqual([240, 220, 180, 255]);
  });
});

describe('anchorAntialiasedEdgeColors', () => {
  it('replaces an invisible edge-only beige with a neighboring opaque artwork color', () => {
    const transparent = [0, 0, 0, 0];
    const teal = [36, 184, 181, 255];
    const hiddenBeige = [224, 205, 164, 220];
    const input = new ImageData(
      new Uint8ClampedArray([
        ...transparent, ...transparent, ...transparent,
        ...transparent, ...hiddenBeige, ...teal,
        ...transparent, ...teal, ...teal,
      ]),
      3,
      3
    );

    const anchored = anchorAntialiasedEdgeColors(input, 180);
    const hardened = applyAlphaThreshold(anchored, 180);
    const center = (1 * 3 + 1) * 4;

    expect([...hardened.data.slice(center, center + 4)]).toEqual(teal);
  });

  it('does not rewrite fully opaque interior colors', () => {
    const beige = [224, 205, 164, 255];
    const input = new ImageData(new Uint8ClampedArray(beige), 1, 1);

    expect([...anchorAntialiasedEdgeColors(input, 180).data]).toEqual(beige);
  });
});
