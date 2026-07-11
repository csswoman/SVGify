import { describe, expect, it } from 'vitest';
import {
  computeCanvasDisplaySize,
  computeVectorizePreviewSize,
  MIN_CANVAS_PX,
} from './canvasDisplaySize';

describe('computeCanvasDisplaySize', () => {
  const bounds = { maxWidth: 900, maxHeight: 600 };

  it('scales tiny icons up to the minimum canvas size', () => {
    expect(computeCanvasDisplaySize({ w: 64, h: 64 }, bounds)).toEqual({
      width: MIN_CANVAS_PX,
      height: MIN_CANVAS_PX,
    });
  });

  it('keeps natural size when within bounds', () => {
    expect(computeCanvasDisplaySize({ w: 400, h: 400 }, bounds)).toEqual({
      width: 400,
      height: 400,
    });
  });

  it('scales large images down to fit max bounds', () => {
    expect(computeCanvasDisplaySize({ w: 3000, h: 2000 }, bounds)).toEqual({
      width: 900,
      height: 600,
    });
  });

  it('preserves aspect ratio for wide panoramas', () => {
    expect(computeCanvasDisplaySize({ w: 2000, h: 500 }, bounds)).toEqual({
      width: 900,
      height: 225,
    });
  });

  it('falls back when viewBox dimensions are invalid', () => {
    expect(computeCanvasDisplaySize({ w: 0, h: 100 }, bounds)).toEqual({
      width: MIN_CANVAS_PX,
      height: MIN_CANVAS_PX,
    });
  });
});

describe('computeVectorizePreviewSize', () => {
  const bounds = { maxWidth: 420, maxHeight: 300 };

  it('scales large images down to fit vectorize preview bounds', () => {
    expect(computeVectorizePreviewSize({ w: 3000, h: 2000 }, bounds)).toEqual({
      width: 420,
      height: 280,
    });
  });

  it('uses a smaller minimum for tiny icons in split view', () => {
    expect(computeVectorizePreviewSize({ w: 64, h: 64 }, bounds)).toEqual({
      width: 120,
      height: 120,
    });
  });
});
