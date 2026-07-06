import { describe, expect, it } from 'vitest';
import { applyAlphaThreshold } from './imageFilters';

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
