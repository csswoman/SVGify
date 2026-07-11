import { describe, expect, it } from 'vitest';
import { getEditableNodes, parsePathD } from './pathEditor';
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

  it('absolutizes SVGO-style relative paths before merging (implicit moveto pairs)', () => {
    // SVGO often emits `m` + implicit relative lineto pairs.
    // A naive leading m→M turns `m150 200 10 0` into absolute L10 0 (spike to origin).
    const a = '<path fill="#cba681" d="m150 200 10 0 0 10 -10 0z"/>';
    const b = '<path fill="#cba681" d="m50 60 10 0 0 10 -10 0z"/>';
    const large = rectPath('#111', 200, 200, 100);
    const svg = `<svg viewBox="0 0 400 400">${large}${a}${b}</svg>`;

    const compacted = compactSvgPaths(svg, 2);
    const mergedD = compacted.match(/fill="#cba681" d="([^"]+)"/)?.[1] ?? '';
    const nodes = getEditableNodes(parsePathD(mergedD));

    expect(nodes.some((n) => n.x >= 150 && n.y >= 200)).toBe(true);
    expect(nodes.some((n) => n.x >= 50 && n.x <= 70 && n.y >= 60 && n.y <= 80)).toBe(true);
    expect(nodes.filter((n) => n.x < 20 && n.y < 20)).toHaveLength(0);
    expect(mergedD).not.toMatch(/[mlhvcsqt]/);
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
