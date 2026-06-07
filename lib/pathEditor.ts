// Editable representation of an SVG path `d` for node-dragging.
// Supports the commands imagetracerjs emits: M, L, C, Q, Z (absolute).
// Each command keeps its coordinate pairs as draggable points; we expose a flat
// list of "anchor" nodes (the on-curve endpoints) for the UI to move.

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathSegment {
  cmd: 'M' | 'L' | 'C' | 'Q' | 'Z';
  // All coordinate pairs for this command, in order. Z has none.
  // For C: [c1, c2, end]; for Q: [c1, end]; for M/L: [end].
  pts: PathPoint[];
}

/** A node the user can drag: the on-curve endpoint of a segment. */
export interface EditableNode {
  segIndex: number; // index into segments
  ptIndex: number;  // index of the anchor point within seg.pts (last one)
  x: number;
  y: number;
}

export function parsePathD(d: string): PathSegment[] {
  const segs: PathSegment[] = [];
  const tokens = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const c = tokens[i++];
    switch (c) {
      case 'M':
      case 'L':
        segs.push({ cmd: c, pts: [{ x: num(), y: num() }] });
        break;
      case 'C':
        segs.push({
          cmd: 'C',
          pts: [
            { x: num(), y: num() },
            { x: num(), y: num() },
            { x: num(), y: num() },
          ],
        });
        break;
      case 'Q':
        segs.push({
          cmd: 'Q',
          pts: [
            { x: num(), y: num() },
            { x: num(), y: num() },
          ],
        });
        break;
      case 'Z':
      case 'z':
        segs.push({ cmd: 'Z', pts: [] });
        break;
      default:
        // skip unexpected token
        break;
    }
  }
  return segs;
}

export function serializePathD(segs: PathSegment[], decimals = 1): string {
  const r = (n: number) => Number(n.toFixed(decimals));
  return segs
    .map((s) => {
      if (s.cmd === 'Z') return 'Z';
      const nums = s.pts.map((p) => `${r(p.x)} ${r(p.y)}`).join(' ');
      return `${s.cmd}${nums}`;
    })
    .join('');
}

/** The draggable anchor nodes (last point of each non-Z segment). */
export function getEditableNodes(segs: PathSegment[]): EditableNode[] {
  const nodes: EditableNode[] = [];
  segs.forEach((s, segIndex) => {
    if (s.cmd === 'Z' || s.pts.length === 0) return;
    const ptIndex = s.pts.length - 1;
    const p = s.pts[ptIndex];
    nodes.push({ segIndex, ptIndex, x: p.x, y: p.y });
  });
  return nodes;
}

/**
 * Move an anchor node by (dx, dy). When the node is the end of a curve, its
 * incoming control handle is shifted with it so the curve follows naturally.
 */
export function moveNode(
  segs: PathSegment[],
  node: EditableNode,
  dx: number,
  dy: number
): PathSegment[] {
  const next = segs.map((s) => ({ cmd: s.cmd, pts: s.pts.map((p) => ({ ...p })) }));
  const seg = next[node.segIndex];
  const anchor = seg.pts[node.ptIndex];
  anchor.x += dx;
  anchor.y += dy;
  // Drag the curve's second control point along with the endpoint.
  if (seg.cmd === 'C' && seg.pts.length === 3) {
    seg.pts[1].x += dx;
    seg.pts[1].y += dy;
  } else if (seg.cmd === 'Q' && seg.pts.length === 2) {
    seg.pts[0].x += dx;
    seg.pts[0].y += dy;
  }
  return next as PathSegment[];
}
