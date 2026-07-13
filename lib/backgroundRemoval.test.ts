import { beforeAll, describe, expect, it } from 'vitest';
import { removeBackground } from './backgroundRemoval';

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

function imageFromRows(rows: number[][][]): ImageData {
  return new ImageData(
    new Uint8ClampedArray(rows.flatMap((row) => row.flatMap((pixel) => [...pixel, 255]))),
    rows[0].length,
    rows.length
  );
}

describe('background removal', () => {
  it('preserves an enclosed foreground color that matches the background', () => {
    const light = [232, 232, 233];
    const dark = [9, 18, 30];
    const source = imageFromRows([
      [light, light, light, light, light],
      [light, dark, dark, dark, light],
      [light, dark, light, dark, light],
      [light, dark, dark, dark, light],
      [light, light, light, light, light],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });

    expect(output.data[(2 * output.width + 2) * 4 + 3]).toBe(255);
    expect(output.data[3]).toBe(0);
  });

  it('removes a checkerboard-style background connected to the image edge', () => {
    const light = [232, 232, 233];
    const shade = [207, 207, 208];
    const dark = [9, 18, 30];
    const source = imageFromRows([
      [light, shade, light, shade, light],
      [shade, dark, dark, dark, shade],
      [light, dark, light, dark, light],
      [shade, dark, dark, dark, shade],
      [light, shade, light, shade, light],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });

    expect(output.data[3]).toBe(0);
    expect(output.data[7]).toBe(0);
    expect(output.data[(2 * output.width + 2) * 4 + 3]).toBe(255);
  });
});
