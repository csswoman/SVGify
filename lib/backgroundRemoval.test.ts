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

function rgbaImageFromRows(rows: number[][][]): ImageData {
  return new ImageData(
    new Uint8ClampedArray(rows.flatMap((row) => row.flatMap((pixel) => pixel))),
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

  it('detects a baked checkerboard inside an existing transparent margin', () => {
    const transparent = [0, 0, 0, 0];
    const light = [232, 232, 233, 255];
    const shade = [207, 207, 208, 255];
    const dark = [9, 18, 30, 255];
    const source = rgbaImageFromRows([
      [transparent, transparent, transparent, transparent, transparent, transparent, transparent],
      [transparent, light, shade, light, shade, light, transparent],
      [transparent, shade, light, shade, light, shade, transparent],
      [transparent, light, shade, dark, shade, light, transparent],
      [transparent, shade, light, shade, light, shade, transparent],
      [transparent, light, shade, light, shade, light, transparent],
      [transparent, transparent, transparent, transparent, transparent, transparent, transparent],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });

    expect(output.data[(1 * output.width + 1) * 4 + 3]).toBe(0);
    expect(output.data[(1 * output.width + 2) * 4 + 3]).toBe(0);
    expect(output.data[(3 * output.width + 3) * 4 + 3]).toBe(255);
  });

  it('removes connected dark neutral seams between baked checkerboard cells', () => {
    const transparent = [0, 0, 0, 0];
    const light = [232, 232, 233, 255];
    const shade = [207, 207, 208, 255];
    const seam = [104, 105, 108, 255];
    const dark = [9, 18, 30, 255];
    const source = rgbaImageFromRows([
      [transparent, transparent, transparent, transparent, transparent, transparent, transparent],
      [transparent, light, seam, shade, seam, light, transparent],
      [transparent, seam, light, seam, shade, seam, transparent],
      [transparent, shade, seam, dark, seam, light, transparent],
      [transparent, seam, shade, seam, light, seam, transparent],
      [transparent, light, seam, light, seam, shade, transparent],
      [transparent, transparent, transparent, transparent, transparent, transparent, transparent],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });
    const seamIndex = (1 * output.width + 2) * 4;
    const iconIndex = (3 * output.width + 3) * 4;

    expect([...output.data.subarray(seamIndex, seamIndex + 4)]).toEqual([0, 0, 0, 0]);
    expect([...output.data.subarray(iconIndex, iconIndex + 4)]).toEqual(dark);
  });
});
