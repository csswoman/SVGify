import { describe, expect, it } from 'vitest';
import { optimizeSvg } from './optimizeSvg';
import { getEditableNodes, moveNode, parsePathD, serializePathD } from './pathEditor';

describe('parsePathD', () => {
  it('parses absolute M/L/C/Q/Z commands', () => {
    const segs = parsePathD('M0 0 L10 0 C12 1 13 2 14 3 Q15 4 16 5 Z');
    expect(segs.map((s) => s.cmd)).toEqual(['M', 'L', 'C', 'Q', 'Z']);
    expect(getEditableNodes(segs)).toHaveLength(4);
  });

  it('parses SVGO h/v shorthand paths', () => {
    const segs = parsePathD('M0 0h10v10h-10Z');
    expect(getEditableNodes(segs)).toHaveLength(4);
    expect(getEditableNodes(segs).map((n) => ({ x: n.x, y: n.y }))).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
  });

  it('parses optimized tracer output', () => {
    const svg =
      '<svg viewBox="0 0 20 10"><path fill="rgb(0,0,0)" d="M0 0 L10 0 L10 10 L0 10 Z"/></svg>';
    const opt = optimizeSvg(svg, { removeStroke: true, mergePaths: false });
    const d = opt.match(/d="([^"]+)"/)?.[1] ?? '';
    expect(getEditableNodes(parsePathD(d))).toHaveLength(4);
  });

  it('parses compressed VTracer path with implicit curves and arc flags', () => {
    const d =
      'M46 14c5.9 5.3 9 10.4 9.4 18.3a23 23 0 01-6.2 15.8 24 24 0 01-18.8 7.2c-7.4-1-12.4-4.5-17-10.3a23 23 0 01-3.4-17c2-7.2';
    const nodes = getEditableNodes(parsePathD(d));
    expect(nodes.length).toBeGreaterThan(4);
    for (const node of nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('parses smooth cubic continuations', () => {
    const d = 'M0 0 C10 0 20 10 30 10 S50 0 60 10';
    const nodes = getEditableNodes(parsePathD(d));
    expect(nodes).toHaveLength(3);
    expect(nodes[2]).toMatchObject({ x: 60, y: 10 });
  });

  it('round-trips edited geometry', () => {
    const segs = parsePathD('M0 0h10v10h-10Z');
    const nodes = getEditableNodes(segs);
    const moved = moveNode(segs, nodes[2], 2, -3);
    const out = serializePathD(moved);
    const reparsed = getEditableNodes(parsePathD(out));
    expect(reparsed[2]).toMatchObject({ x: 12, y: 7 });
  });
});
