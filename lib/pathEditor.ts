// Editable representation of an SVG path `d` for node-dragging.
// Supports the commands VTracer/SVGO emit: M/L/C/Q/H/V, smooth curves, and arcs.
// Arcs are stored as line endpoints for handle placement; use normalizeEditablePathD
// in the browser before editing if the path must keep curve fidelity.

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

const CMD_RE = /[MLCQAZHVSTmlcqazhvst]/;

function isCmdChar(ch: string): boolean {
  return CMD_RE.test(ch);
}

function isCurveCmd(cmd: string | null): boolean {
  return cmd === 'C' || cmd === 'c' || cmd === 'S' || cmd === 's';
}

function isQuadCmd(cmd: string | null): boolean {
  return cmd === 'Q' || cmd === 'q' || cmd === 'T' || cmd === 't';
}

export function parsePathD(d: string): PathSegment[] {
  const segs: PathSegment[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCmd: string | null = null;
  let lastCtrlX = 0;
  let lastCtrlY = 0;

  const skipSeparators = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };

  const peekCmd = () => {
    skipSeparators();
    return i < d.length && isCmdChar(d[i]);
  };

  const readCmd = (): string | null => {
    skipSeparators();
    if (i < d.length && isCmdChar(d[i])) return d[i++];
    return null;
  };

  const readNumber = (): number | null => {
    skipSeparators();
    if (i >= d.length || isCmdChar(d[i])) return null;
    const m = d.slice(i).match(/^([+-]?(?:\d+\.\d+|\.\d+|\d+)(?:[eE][+-]?\d+)?)/);
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };

  const readArcFlag = (): number => {
    skipSeparators();
    if (i < d.length && (d[i] === '0' || d[i] === '1')) {
      return Number(d[i++]);
    }
    return readNumber() ?? 0;
  };

  const setCurveCtrl = (x: number, y: number) => {
    lastCtrlX = x;
    lastCtrlY = y;
  };

  const pushMove = (x: number, y: number) => {
    cx = x;
    cy = y;
    sx = x;
    sy = y;
    segs.push({ cmd: 'M', pts: [{ x, y }] });
    lastCmd = 'M';
  };

  const pushLine = (x: number, y: number, sourceCmd: string) => {
    cx = x;
    cy = y;
    segs.push({ cmd: 'L', pts: [{ x, y }] });
    lastCmd = sourceCmd;
  };

  const pushCubic = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
    sourceCmd: string
  ) => {
    cx = x;
    cy = y;
    setCurveCtrl(x2, y2);
    segs.push({
      cmd: 'C',
      pts: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x, y },
      ],
    });
    lastCmd = sourceCmd;
  };

  const pushQuad = (x1: number, y1: number, x: number, y: number, sourceCmd: string) => {
    cx = x;
    cy = y;
    setCurveCtrl(x1, y1);
    segs.push({
      cmd: 'Q',
      pts: [
        { x: x1, y: y1 },
        { x, y },
      ],
    });
    lastCmd = sourceCmd;
  };

  const reflectedCurveCtrl = () => ({
    x: isCurveCmd(lastCmd) ? 2 * cx - lastCtrlX : cx,
    y: isCurveCmd(lastCmd) ? 2 * cy - lastCtrlY : cy,
  });

  const reflectedQuadCtrl = () => ({
    x: isQuadCmd(lastCmd) ? 2 * cx - lastCtrlX : cx,
    y: isQuadCmd(lastCmd) ? 2 * cy - lastCtrlY : cy,
  });

  const parseLinePairs = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const x = readNumber();
      if (x === null) break;
      const y = readNumber();
      if (y === null) break;
      if (relative) pushLine(cx + x, cy + y, sourceCmd);
      else pushLine(x, y, sourceCmd);
      if (peekCmd()) break;
    }
  };

  const parseCubics = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const x1 = readNumber();
      if (x1 === null) break;
      const y1 = readNumber();
      const x2 = readNumber();
      const y2 = readNumber();
      const x = readNumber();
      const y = readNumber();
      if (y1 === null || x2 === null || y2 === null || x === null || y === null) break;
      if (relative) {
        pushCubic(cx + x1, cy + y1, cx + x2, cy + y2, cx + x, cy + y, sourceCmd);
      } else {
        pushCubic(x1, y1, x2, y2, x, y, sourceCmd);
      }
      if (peekCmd()) break;
    }
  };

  const parseSmoothCubics = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const x2 = readNumber();
      if (x2 === null) break;
      const y2 = readNumber();
      const x = readNumber();
      const y = readNumber();
      if (y2 === null || x === null || y === null) break;
      const cp1 = reflectedCurveCtrl();
      if (relative) {
        pushCubic(cp1.x, cp1.y, cx + x2, cy + y2, cx + x, cy + y, sourceCmd);
      } else {
        pushCubic(cp1.x, cp1.y, x2, y2, x, y, sourceCmd);
      }
      if (peekCmd()) break;
    }
  };

  const parseQuads = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const x1 = readNumber();
      if (x1 === null) break;
      const y1 = readNumber();
      const x = readNumber();
      const y = readNumber();
      if (y1 === null || x === null || y === null) break;
      if (relative) pushQuad(cx + x1, cy + y1, cx + x, cy + y, sourceCmd);
      else pushQuad(x1, y1, x, y, sourceCmd);
      if (peekCmd()) break;
    }
  };

  const parseSmoothQuads = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const x = readNumber();
      if (x === null) break;
      const y = readNumber();
      if (y === null) break;
      const cp = reflectedQuadCtrl();
      if (relative) pushQuad(cp.x, cp.y, cx + x, cy + y, sourceCmd);
      else pushQuad(cp.x, cp.y, x, y, sourceCmd);
      if (peekCmd()) break;
    }
  };

  const parseArcs = (relative: boolean, sourceCmd: string) => {
    while (true) {
      const rx = readNumber();
      if (rx === null) break;
      const ry = readNumber();
      const rot = readNumber();
      const large = readArcFlag();
      const sweep = readArcFlag();
      let x = readNumber();
      let y = readNumber();
      if (ry === null || rot === null || x === null || y === null) break;
      if (relative) {
        x += cx;
        y += cy;
      }
      pushLine(x, y, sourceCmd);
      if (peekCmd()) break;
    }
  };

  while (i < d.length) {
    const nextCmd = readCmd();
    if (nextCmd) cmd = nextCmd;
    if (!cmd) {
      i++;
      continue;
    }

    switch (cmd) {
      case 'M': {
        let first = true;
        while (true) {
          const x = readNumber();
          if (x === null) break;
          const y = readNumber();
          if (y === null) break;
          if (first) {
            pushMove(x, y);
            first = false;
          } else {
            pushLine(x, y, 'L');
          }
          if (peekCmd()) break;
        }
        break;
      }
      case 'm': {
        let first = true;
        while (true) {
          const dx = readNumber();
          if (dx === null) break;
          const dy = readNumber();
          if (dy === null) break;
          if (first) {
            pushMove(cx + dx, cy + dy);
            first = false;
          } else {
            pushLine(cx + dx, cy + dy, 'l');
          }
          if (peekCmd()) break;
        }
        break;
      }
      case 'L':
        parseLinePairs(false, 'L');
        break;
      case 'l':
        parseLinePairs(true, 'l');
        break;
      case 'H':
        while (true) {
          const x = readNumber();
          if (x === null) break;
          pushLine(x, cy, 'L');
          if (peekCmd()) break;
        }
        break;
      case 'h':
        while (true) {
          const dx = readNumber();
          if (dx === null) break;
          pushLine(cx + dx, cy, 'l');
          if (peekCmd()) break;
        }
        break;
      case 'V':
        while (true) {
          const y = readNumber();
          if (y === null) break;
          pushLine(cx, y, 'L');
          if (peekCmd()) break;
        }
        break;
      case 'v':
        while (true) {
          const dy = readNumber();
          if (dy === null) break;
          pushLine(cx, cy + dy, 'l');
          if (peekCmd()) break;
        }
        break;
      case 'C':
        parseCubics(false, 'C');
        break;
      case 'c':
        parseCubics(true, 'c');
        break;
      case 'S':
        parseSmoothCubics(false, 'S');
        break;
      case 's':
        parseSmoothCubics(true, 's');
        break;
      case 'Q':
        parseQuads(false, 'Q');
        break;
      case 'q':
        parseQuads(true, 'q');
        break;
      case 'T':
        parseSmoothQuads(false, 'T');
        break;
      case 't':
        parseSmoothQuads(true, 't');
        break;
      case 'A':
        parseArcs(false, 'A');
        break;
      case 'a':
        parseArcs(true, 'a');
        break;
      case 'Z':
      case 'z':
        cx = sx;
        cy = sy;
        segs.push({ cmd: 'Z', pts: [] });
        lastCmd = cmd;
        cmd = '';
        break;
      default:
        cmd = '';
        i++;
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
