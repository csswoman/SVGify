import { describe, expect, it } from 'vitest';
import { curveSmoothSvgPaths } from './simplifyPath';

describe('path curve smoothing', () => {
  it('converts closed polygon paths to quadratic curves', () => {
    const svg = '<svg><path fill="#111" d="M0 0L10 0L10 10L0 10Z"/></svg>';

    const smoothed = curveSmoothSvgPaths(svg, 1, 0.1, 1);

    expect(smoothed).toContain('Q');
    expect(smoothed).toContain('Z');
  });

  it('can be disabled to preserve raw polygon paths', () => {
    const svg = '<svg><path fill="#111" d="M0 0L10 0L10 10L0 10Z"/></svg>';

    expect(curveSmoothSvgPaths(svg, 0)).toBe(svg);
  });
});
