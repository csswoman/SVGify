import { describe, expect, it } from 'vitest';
import { compactSvgPaths, countSvgPaths } from './svgPathCompaction';

function rectPath(fill: string, x: number, y: number, size = 1): string {
  return `<path fill="${fill}" d="M${x} ${y}L${x + size} ${y}L${x + size} ${y + size}L${x} ${y + size}Z"/>`;
}

describe('svg path compaction', () => {
  it('keeps large shapes separate and merges small same-color fragments to meet a target', () => {
    const large = rectPath('#111', 0, 0, 100);
    const fragments = Array.from({ length: 20 }, (_, i) => rectPath('#cba681', i, 120));
    const svg = `<svg>${large}${fragments.join('')}</svg>`;

    const compacted = compactSvgPaths(svg, 5);

    expect(countSvgPaths(compacted)).toBeLessThanOrEqual(5);
    expect(compacted).toContain('M0 0L100 0L100 100L0 100Z');
    expect(compacted).toContain('M0 120L1 120L1 121L0 121Z');
    expect(compacted).toContain('M19 120L20 120L20 121L19 121Z');
  });

  it('does not merge paths that already carry labels or classes', () => {
    const labeled = '<path fill="#111" data-label="ear" class="part-ear" d="M0 0L10 0L10 10Z"/>';
    const fragments = Array.from({ length: 10 }, (_, i) => rectPath('#111', i, 20));
    const svg = `<svg>${labeled}${fragments.join('')}</svg>`;

    const compacted = compactSvgPaths(svg, 2);

    expect(compacted).toContain('data-label="ear"');
    expect(compacted).toContain('class="part-ear"');
    expect(countSvgPaths(compacted)).toBe(2);
  });

  it('keeps relative-start subpaths in place when merging (leading m must become absolute M)', () => {
    // Standalone, leading `m` is treated as absolute. After concatenation it is
    // relative to the previous subpath's current point — which shifts geometry
    // outside the viewBox unless we normalize to absolute M.
    const a = '<path fill="#cba681" d="m0 0l10 0l0 10l-10 0z"/>';
    const b = '<path fill="#cba681" d="m50 50l10 0l0 10l-10 0z"/>';
    const large = rectPath('#111', 0, 0, 100);
    const svg = `<svg viewBox="0 0 100 100">${large}${a}${b}</svg>`;

    const compacted = compactSvgPaths(svg, 2);
    const mergedD = compacted.match(/fill="#cba681" d="([^"]+)"/)?.[1] ?? '';

    expect(mergedD).toMatch(/M50[\s,]50|M50 50/);
    expect(mergedD).not.toMatch(/zm50/);
  });

  it('replaces merged paths at their original indices so later shapes are not shifted', () => {
    const keepEarly = rectPath('#111', 0, 0, 100);
    const fragA = rectPath('#cba681', 0, 120);
    const fragB = rectPath('#cba681', 2, 120);
    const keepLate = rectPath('#222', 50, 50, 40);
    const svg = `<svg>${keepEarly}${fragA}${fragB}<g id="after-frags"/>${keepLate}</svg>`;

    const compacted = compactSvgPaths(svg, 3);
    const markerAt = compacted.indexOf('id="after-frags"');
    const lateAt = compacted.indexOf('fill="#222"');

    expect(markerAt).toBeGreaterThan(-1);
    expect(lateAt).toBeGreaterThan(markerAt);
    expect(compacted).toContain('M0 120');
    expect(compacted).toContain('M2 120');
  });
});
