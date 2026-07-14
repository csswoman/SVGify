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
      svgo: false,
    });

    expect(optimized).toContain('<svg stroke-width="1">');
    expect(optimized).toContain('fill="rgb(12, 34, 56)" stroke="rgb(12, 34, 56)"');
    expect(optimized).toContain('fill="#abc" stroke="#abc"');
    expect((optimized.match(/stroke-width=/g) ?? []).length).toBe(1);
  });

  it('removes strokes when seam sealing is disabled', () => {
    const svg = '<svg><path fill="rgb(1, 2, 3)" stroke="rgb(1, 2, 3)" stroke-width="1" d="M0 0Z"/></svg>';

    const optimized = optimizeSvg(svg, { sealSeams: 0 });

    expect(optimized).not.toContain('stroke=');
    expect(optimized).not.toContain('stroke-width=');
  });

  it('can preserve separate paths for path-level editing tools', () => {
    const svg =
      '<svg viewBox="0 0 20 10"><path fill="#000" d="M0 0h2v2H0z"/><path fill="#000" d="M10 0h2v2h-2z"/></svg>';

    const optimized = optimizeSvg(svg, { mergePaths: false });

    expect((optimized.match(/<path\b/g) ?? []).length).toBe(2);
  });

  it('can split compound same-color subpaths for erase-by-piece editing', () => {
    const svg =
      '<svg viewBox="0 0 20 10"><path fill="#000" d="M0 0h2v2H0zM10 0h2v2h-2z"/></svg>';

    const optimized = optimizeSvg(svg, {
      splitCompoundPaths: true,
      mergePaths: false,
    });

    expect((optimized.match(/<path\b/g) ?? []).length).toBe(2);
  });
});
