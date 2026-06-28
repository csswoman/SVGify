import { describe, expect, it } from 'vitest';
import { optimizeSvg } from './optimizeSvg';

describe('optimizeSvg seam sealing', () => {
  it('adds a same-color stroke for rgb and hex fills', () => {
    const svg =
      '<svg><path fill="rgb(12, 34, 56)" d="M0 0L1 1Z"/><path fill="#abc" d="M1 1L2 2Z"/></svg>';

    const optimized = optimizeSvg(svg, {
      sealSeams: 1,
      minifyColors: false,
      compressPaths: false,
    });

    expect(optimized).toContain('fill="rgb(12, 34, 56)" stroke="rgb(12, 34, 56)" stroke-width="1"');
    expect(optimized).toContain('fill="#abc" stroke="#abc" stroke-width="1"');
  });

  it('removes strokes when seam sealing is disabled', () => {
    const svg = '<svg><path fill="rgb(1, 2, 3)" stroke="rgb(1, 2, 3)" stroke-width="1" d="M0 0Z"/></svg>';

    const optimized = optimizeSvg(svg, { sealSeams: 0 });

    expect(optimized).not.toContain('stroke=');
    expect(optimized).not.toContain('stroke-width=');
  });
});
