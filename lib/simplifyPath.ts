// Aggressive geometry simplification for SVG paths produced by imagetracerjs.
// Reduces the number of points per path with the Ramer–Douglas–Peucker
// algorithm while preserving the overall shape. This is the main lever for
// turning a heavy traced SVG into a light one ("removing resolution" in the
// sense that matters for vectors: fewer points, not fewer pixels).

interface Pt {
  x: number;
  y: number;
}

/** Perpendicular distance from point p to the line a–b. */
function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // |cross product| / |b - a|
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

/** Ramer–Douglas–Peucker on an open polyline. */
function rdp(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

/**
 * Parse a path `d` into subpaths of points. Curve control points are dropped
 * (we keep anchor/end points), which is a lossy-but-shape-preserving choice
 * that lets RDP collapse the dense point stream imagetracer produces.
 */
function parseSubpaths(d: string): Pt[][] {
  const subpaths: Pt[][] = [];
  let current: Pt[] = [];
  // Tokens: a command letter or a number.
  const tokens = d.match(/[MLCQAZHVSTmlcqazhvst]|-?\d*\.?\d+/g) ?? [];
  let i = 0;

  const pushPoint = (x: number, y: number) => {
    current.push({ x, y });
  };

  while (i < tokens.length) {
    const tk = tokens[i++];
    switch (tk) {
      case 'M':
      case 'L': {
        const x = Number(tokens[i++]);
        const y = Number(tokens[i++]);
        if (tk === 'M' && current.length) {
          subpaths.push(current);
          current = [];
        }
        pushPoint(x, y);
        break;
      }
      case 'C': {
        // cubic: x1 y1 x2 y2 x y — keep only the end point.
        i += 4;
        const x = Number(tokens[i++]);
        const y = Number(tokens[i++]);
        pushPoint(x, y);
        break;
      }
      case 'Q': {
        i += 2;
        const x = Number(tokens[i++]);
        const y = Number(tokens[i++]);
        pushPoint(x, y);
        break;
      }
      case 'Z':
      case 'z':
        if (current.length) {
          subpaths.push(current);
          current = [];
        }
        break;
      default:
        // Unsupported/relative command — skip its letter; numbers handled above.
        break;
    }
  }
  if (current.length) subpaths.push(current);
  return subpaths;
}

function isClosedSubpath(points: Pt[]): boolean {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return Math.hypot(first.x - last.x, first.y - last.y) < 0.5;
}

/** Chaikin corner-cutting for closed polylines — rounds pixel-stair edges. */
function chaikinClosed(points: Pt[], iterations: number): Pt[] {
  if (points.length < 3 || iterations <= 0) return points;
  let current = isClosedSubpath(points) ? points.slice(0, -1) : points;

  for (let iter = 0; iter < iterations; iter++) {
    const next: Pt[] = [];
    const n = current.length;
    for (let i = 0; i < n; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % n];
      next.push(
        { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y },
        { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y }
      );
    }
    current = next;
  }

  return current;
}

/**
 * Smooth jagged traced edges with Chaikin + light RDP. Keeps curves unlike
 * aggressive simplifySvgPaths used for max compression.
 */
export function smoothSvgPaths(svg: string, iterations = 2, epsilon = 0.75, decimals = 2): string {
  return svg.replace(/d="([^"]*)"/g, (_full, d: string) => {
    const subpaths = parseSubpaths(d).map((sp) => {
      if (sp.length < 4) return sp;
      const rounded = chaikinClosed(sp, iterations);
      return rdp(rounded.length >= 3 ? [...rounded, rounded[0]] : rounded, epsilon);
    });
    const out = subpathsToD(subpaths, decimals);
    return `d="${out || d}"`;
  });
}

/** Serialize simplified subpaths back to a polygonal `d` (M…L…Z per subpath). */
function subpathsToD(subpaths: Pt[][], decimals: number): string {
  const r = (n: number) => Number(n.toFixed(decimals));
  return subpaths
    .filter((sp) => sp.length >= 2)
    .map((sp) => {
      let s = `M${r(sp[0].x)} ${r(sp[0].y)}`;
      for (let i = 1; i < sp.length; i++) s += `L${r(sp[i].x)} ${r(sp[i].y)}`;
      return s + 'Z';
    })
    .join('');
}

function subpathsToQuadraticD(subpaths: Pt[][], decimals: number): string {
  const r = (n: number) => Number(n.toFixed(decimals));
  return subpaths
    .filter((sp) => sp.length >= 3)
    .map((sp) => {
      const points = isClosedSubpath(sp) ? sp.slice(0, -1) : sp;
      if (points.length < 3) return '';

      const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      let s = `M${r(points[0].x)} ${r(points[0].y)}`;

      for (let i = 0; i < points.length; i++) {
        const control = points[i];
        const next = points[(i + 1) % points.length];
        const end = mid(control, next);
        s += `Q${r(control.x)} ${r(control.y)} ${r(end.x)} ${r(end.y)}`;
      }

      return s + 'Z';
    })
    .join('');
}

/**
 * Simplify every path `d` in an SVG string. `epsilon` controls aggressiveness
 * (higher = fewer points = smaller file). Curves are flattened to polygons,
 * which is what makes traced shapes drop weight dramatically.
 */
export function simplifySvgPaths(svg: string, epsilon: number, decimals = 0): string {
  return svg.replace(/d="([^"]*)"/g, (_full, d: string) => {
    return `d="${simplifyPathD(d, epsilon, decimals)}"`;
  });
}

export function curveSmoothSvgPaths(svg: string, iterations = 1, epsilon = 0.35, decimals = 1): string {
  if (iterations <= 0) return svg;
  const level = Math.min(2, Math.max(1, Math.floor(iterations)));

  return svg.replace(/d="([^"]*)"/g, (_full, d: string) => {
    const subpaths = parseSubpaths(d).map((sp) => {
      if (sp.length < 4) return sp;
      const rounded = level >= 2 ? chaikinClosed(sp, 1) : sp;
      const closed = rounded.length >= 3 ? [...rounded, rounded[0]] : rounded;
      return rdp(closed, level >= 2 ? Math.max(epsilon, 1.2) : Math.max(epsilon, 0.9));
    });
    const out = subpathsToQuadraticD(subpaths, decimals);
    return `d="${out || d}"`;
  });
}

export function simplifyPathD(d: string, epsilon: number, decimals = 0): string {
  const subpaths = parseSubpaths(d).map((sp) => rdp(sp, epsilon));
  return subpathsToD(subpaths, decimals) || d;
}

/** Count total path elements in an SVG string (a proxy for complexity). */
export function countPaths(svg: string): number {
  return (svg.match(/<path\b/g) ?? []).length;
}
