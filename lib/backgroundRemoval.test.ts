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
  it('preserves dark colored artwork on a black background', () => {
    const black = [0, 0, 0];
    const navy = [33, 42, 57];
    const source = imageFromRows([
      [black, black, black, black, black],
      [black, navy, navy, navy, black],
      [black, navy, navy, navy, black],
      [black, navy, navy, navy, black],
      [black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });

    expect([...output.data.subarray((2 * output.width + 2) * 4, (2 * output.width + 2) * 4 + 4)])
      .toEqual([...navy, 255]);
    expect(output.data[3]).toBe(0);
  });

  it('decontaminates a dark anti-aliased logo edge after removing black', () => {
    const black = [0, 0, 0];
    const edge = [25, 32, 43];
    const navy = [33, 42, 57];
    const source = imageFromRows([
      [black, black, black, black, black],
      [black, edge, edge, edge, black],
      [black, edge, navy, edge, black],
      [black, edge, edge, edge, black],
      [black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });
    const edgeIndex = (1 * output.width + 2) * 4;

    // Mostly-foreground coverage must come out fully opaque: the vectorize
    // pipeline hard-thresholds alpha at 180, and fractional edges turned into
    // 2-3px bites on shape borders (sun/star notches).
    expect([...output.data.subarray(edgeIndex, edgeIndex + 4)]).toEqual([...navy, 255]);
    expect(output.data[(2 * output.width + 2) * 4 + 3]).toBe(255);
  });

  it('drops mostly-background fringe pixels instead of leaving translucent remnants', () => {
    const black = [0, 0, 0];
    const faint = [77, 77, 77]; // ~30% white blended into a black canvas
    const white = [255, 255, 255];
    const source = imageFromRows([
      [black, black, black, black, black],
      [black, faint, faint, faint, black],
      [black, faint, white, faint, black],
      [black, faint, faint, faint, black],
      [black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });

    expect(output.data[(1 * output.width + 2) * 4 + 3]).toBe(0);
    expect([...output.data.subarray((2 * output.width + 2) * 4, (2 * output.width + 2) * 4 + 4)])
      .toEqual([...white, 255]);
  });

  it('drops hue-shifted accent fringe instead of tracing it as dark brown', () => {
    const black = [0, 0, 0];
    // WebP can darken a yellow edge unevenly, reducing its blue channel more
    // than red and green. It is still a background blend, not a brown detail.
    const darkYellowEdge = [42, 28, 0];
    const yellow = [241, 190, 60];
    const source = imageFromRows([
      [black, black, black, black, black],
      [black, darkYellowEdge, yellow, yellow, black],
      [black, darkYellowEdge, yellow, yellow, black],
      [black, darkYellowEdge, yellow, yellow, black],
      [black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 48, contiguous: true });
    const edgeIndex = (2 * output.width + 1) * 4;

    expect(output.data[edgeIndex + 3]).toBe(0);
    expect([...output.data.subarray((2 * output.width + 2) * 4, (2 * output.width + 2) * 4 + 4)])
      .toEqual([...yellow, 255]);
  });

  it('keeps yellow at a white junction in the strict opaque-matte pipeline', () => {
    const black = [0, 0, 0];
    const darkYellowEdge = [160, 110, 15];
    const yellow = [241, 190, 60];
    const white = [255, 255, 255];
    const source = imageFromRows([
      [black, black, black, black, black, black],
      [black, darkYellowEdge, yellow, white, white, black],
      [black, darkYellowEdge, yellow, white, white, black],
      [black, darkYellowEdge, yellow, white, white, black],
      [black, black, black, black, black, black],
    ]);

    const output = removeBackground(source, {
      tolerance: 128,
      contiguous: true,
      matteCoreToleranceCap: 12,
      matteFringeDepth: 6,
      matteHueGuard: true,
    });
    const edgeIndex = (2 * output.width + 1) * 4;

    expect([...output.data.subarray(edgeIndex, edgeIndex + 4)]).toEqual([...yellow, 255]);
  });

  it('preserves a distinct dark shape when tolerance is cranked up', () => {
    const black = [0, 0, 0];
    const navy = [33, 42, 57];
    const source = imageFromRows([
      [black, black, black, black, black, black, black],
      [black, black, black, black, black, black, black],
      [black, black, navy, navy, navy, black, black],
      [black, black, navy, navy, navy, black, black],
      [black, black, navy, navy, navy, black, black],
      [black, black, black, black, black, black, black],
      [black, black, black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 128, contiguous: true });

    // The canvas is removed, but the solid navy plateau must not be flooded
    // away just because a high tolerance radius reaches its color.
    expect([...output.data.subarray((3 * output.width + 3) * 4, (3 * output.width + 3) * 4 + 4)])
      .toEqual([...navy, 255]);
    expect(output.data[3]).toBe(0);
  });

  it('still removes the contact halo ring at high tolerance', () => {
    const black = [0, 0, 0];
    const halo = [60, 60, 60];
    const white = [255, 255, 255];
    const source = imageFromRows([
      [black, black, black, black, black, black, black],
      [black, halo, halo, halo, halo, halo, black],
      [black, halo, white, white, white, halo, black],
      [black, halo, white, white, white, halo, black],
      [black, halo, white, white, white, halo, black],
      [black, halo, halo, halo, halo, halo, black],
      [black, black, black, black, black, black, black],
    ]);

    const output = removeBackground(source, { tolerance: 128, contiguous: true });

    // The dark halo hugging the background is inside the extended tolerance
    // band and touches removed canvas, so it goes away…
    expect(output.data[(1 * output.width + 3) * 4 + 3]).toBe(0);
    // …while the shape itself stays.
    expect([...output.data.subarray((3 * output.width + 3) * 4, (3 * output.width + 3) * 4 + 4)])
      .toEqual([...white, 255]);
  });

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
