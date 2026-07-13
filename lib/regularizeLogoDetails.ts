import { parsePathD, serializePathD, type PathSegment } from './pathEditor';

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function anchorBounds(segments: readonly PathSegment[]): Bounds | null {
  const anchors = segments.flatMap((segment) => {
    if (segment.cmd === 'Z' || segment.pts.length === 0) return [];
    return [segment.pts[segment.pts.length - 1]];
  });
  if (anchors.length < 3) return null;

  return {
    left: Math.min(...anchors.map((point) => point.x)),
    top: Math.min(...anchors.map((point) => point.y)),
    right: Math.max(...anchors.map((point) => point.x)),
    bottom: Math.max(...anchors.map((point) => point.y)),
  };
}

function curvedSides(segments: readonly PathSegment[], middleX: number): { left: boolean; right: boolean } {
  let left = false;
  let right = false;

  for (const segment of segments) {
    if (segment.cmd !== 'C' && segment.cmd !== 'Q') continue;
    const averageX = segment.pts.reduce((sum, point) => sum + point.x, 0) / segment.pts.length;
    if (averageX < middleX) left = true;
    else right = true;
  }

  return { left, right };
}

function inferPolygonRoundedSide(
  segments: readonly PathSegment[],
  bounds: Bounds
): { left: boolean; right: boolean } {
  const anchors = segments.flatMap((segment) =>
    segment.cmd === 'Z' || segment.pts.length === 0 ? [] : [segment.pts[segment.pts.length - 1]]
  );
  const band = (bounds.right - bounds.left) * 0.25;
  const leftCount = anchors.filter((point) => point.x <= bounds.left + band).length;
  const rightCount = anchors.filter((point) => point.x >= bounds.right - band).length;
  if (rightCount > leftCount) return { left: false, right: true };
  if (leftCount > rightCount) return { left: true, right: false };
  return { left: false, right: false };
}

function regularHorizontalBar(d: string, canvasSize: number): string | null {
  const segments = parsePathD(d);
  const moveCount = segments.filter((segment) => segment.cmd === 'M').length;
  const closeCount = segments.filter((segment) => segment.cmd === 'Z').length;
  if (moveCount !== 1 || closeCount !== 1 || segments.length < 4 || segments.length > 9) return null;

  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (
    height < 1 ||
    width / height < 3 ||
    height > canvasSize * 0.08 ||
    width < canvasSize * 0.08 ||
    width > canvasSize * 0.45
  ) {
    return null;
  }

  let sides = curvedSides(segments, (bounds.left + bounds.right) / 2);
  if (!sides.left && !sides.right) sides = inferPolygonRoundedSide(segments, bounds);
  if (!sides.left && !sides.right) return null;

  // Small logo bars read more cleanly as contained capsules. Inset them by a
  // fraction of their height so antialiasing cannot protrude past the parent.
  const inset = Math.min(1, height * 0.12);
  const left = round(bounds.left + inset);
  const top = round(bounds.top);
  const right = round(bounds.right - inset);
  const bottom = round(bounds.bottom);
  const middleY = round((top + bottom) / 2);
  const radius = round(Math.min(height / 2, width * 0.15));
  const leftInset = round(left + radius);
  const rightInset = round(right - radius);
  return `M${leftInset} ${top}H${rightInset}Q${right} ${top} ${right} ${middleY}Q${right} ${bottom} ${rightInset} ${bottom}H${leftInset}Q${left} ${bottom} ${left} ${middleY}Q${left} ${top} ${leftInset} ${top}Z`;
}

function regularSmallCircle(d: string, canvasSize: number): string | null {
  const segments = parsePathD(d);
  const moveCount = segments.filter((segment) => segment.cmd === 'M').length;
  const closeCount = segments.filter((segment) => segment.cmd === 'Z').length;
  if (moveCount !== 1 || closeCount !== 1) return null;
  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const size = Math.max(width, height);
  if (
    segments.length < 7 ||
    size < canvasSize * 0.04 ||
    size > canvasSize * 0.15 ||
    Math.min(width, height) / size < 0.78
  ) {
    return null;
  }

  const cx = round((bounds.left + bounds.right) / 2);
  const cy = round((bounds.top + bounds.bottom) / 2);
  const rx = round(width / 2);
  const ry = round(height / 2);
  const anchors = segments.flatMap((segment) =>
    segment.cmd === 'Z' || segment.pts.length === 0 ? [] : [segment.pts[segment.pts.length - 1]]
  );
  const normalizedRadii = anchors.map((point) =>
    Math.hypot((point.x - cx) / Math.max(rx, 0.01), (point.y - cy) / Math.max(ry, 0.01))
  );
  if (normalizedRadii.some((radius) => radius < 0.72 || radius > 1.28)) return null;

  return `M${cx} ${round(cy - ry)}A${rx} ${ry} 0 1 1 ${cx} ${round(cy + ry)}A${rx} ${ry} 0 1 1 ${cx} ${round(cy - ry)}Z`;
}

interface Point {
  x: number;
  y: number;
}

function polygonSubpaths(segments: readonly PathSegment[]): Point[][] | null {
  const subpaths: Point[][] = [];
  let current: Point[] | null = null;
  for (const segment of segments) {
    if (segment.cmd === 'M') {
      current = [{ ...segment.pts[0] }];
      subpaths.push(current);
    } else if (segment.cmd === 'L' && current) {
      current.push({ ...segment.pts[0] });
    } else if (segment.cmd !== 'Z') {
      return null;
    }
  }
  return subpaths.length > 0 && subpaths.every((points) => points.length >= 3) ? subpaths : null;
}

function anchorSubpaths(segments: readonly PathSegment[]): Point[][] | null {
  const subpaths: Point[][] = [];
  let current: Point[] | null = null;
  for (const segment of segments) {
    if (segment.cmd === 'M') {
      current = [{ ...segment.pts[0] }];
      subpaths.push(current);
    } else if (segment.cmd !== 'Z' && current && segment.pts.length > 0) {
      current.push({ ...segment.pts[segment.pts.length - 1] });
    }
  }
  return subpaths.length > 0 && subpaths.every((points) => points.length >= 3) ? subpaths : null;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toward(from: Point, to: Point, amount: number): Point {
  const length = distance(from, to);
  if (length === 0) return { ...from };
  const ratio = amount / length;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function pointString(point: Point): string {
  return `${round(point.x)} ${round(point.y)}`;
}

function roundedPolygonPath(points: readonly Point[], radius: number): string {
  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const cut = Math.min(radius, distance(point, previous) * 0.32, distance(point, next) * 0.32);
    return {
      before: toward(point, previous, cut),
      vertex: point,
      after: toward(point, next, cut),
    };
  });

  let output = `M${pointString(corners[0].before)}Q${pointString(corners[0].vertex)} ${pointString(corners[0].after)}`;
  for (let index = 1; index < corners.length; index++) {
    const corner = corners[index];
    output += `L${pointString(corner.before)}Q${pointString(corner.vertex)} ${pointString(corner.after)}`;
  }
  return `${output}Z`;
}

function roundLargePolygon(d: string, canvasSize: number): string | null {
  const segments = parsePathD(d);
  const subpaths = polygonSubpaths(segments);
  if (!subpaths) return null;
  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (Math.max(width, height) < canvasSize * 0.25) return null;

  const radius = Math.max(1, Math.min(3, Math.min(width, height) * 0.045));
  return subpaths.map((points) => roundedPolygonPath(points, radius)).join('');
}

function pointsBounds(points: readonly Point[]): Bounds {
  return {
    left: Math.min(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}

function regularLetterN(d: string, canvasSize: number): string | null {
  const subpaths = polygonSubpaths(parsePathD(d));
  if (!subpaths || subpaths.length !== 1) return null;
  const points = subpaths[0];
  if (points.length < 8 || points.length > 18) return null;

  const bounds = pointsBounds(points);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (
    width < canvasSize * 0.07 ||
    width > canvasSize * 0.2 ||
    height < canvasSize * 0.1 ||
    height > canvasSize * 0.24 ||
    width / height < 0.55 ||
    width / height > 1.05
  ) {
    return null;
  }

  const cornerToleranceX = width * 0.12;
  const cornerToleranceY = height * 0.12;
  const hasCorner = (x: number, y: number) =>
    points.some(
      (point) => Math.abs(point.x - x) <= cornerToleranceX && Math.abs(point.y - y) <= cornerToleranceY
    );
  if (
    !hasCorner(bounds.left, bounds.top) ||
    !hasCorner(bounds.left, bounds.bottom) ||
    !hasCorner(bounds.right, bounds.top) ||
    !hasCorner(bounds.right, bounds.bottom)
  ) {
    return null;
  }

  const edges = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return { a: point, b: next, dx: next.x - point.x, dy: next.y - point.y };
  });
  const hasOuterStem = (x: number) =>
    edges.some(
      (edge) =>
        Math.abs(edge.a.x - x) <= cornerToleranceX &&
        Math.abs(edge.b.x - x) <= cornerToleranceX &&
        Math.abs(edge.dy) >= height * 0.75
    );
  if (!hasOuterStem(bounds.left) || !hasOuterStem(bounds.right)) return null;

  const diagonals = edges.filter(
    (edge) => Math.abs(edge.dx) >= width * 0.18 && Math.abs(edge.dy) >= height * 0.18
  );
  // An N has two parallel down-right boundaries. Requiring that shared slope
  // distinguishes it from M/A-like glyphs whose diagonals oppose each other.
  if (diagonals.length < 2 || diagonals.some((edge) => edge.dx * edge.dy <= 0)) return null;

  const left = round(bounds.left);
  const top = round(bounds.top);
  const right = round(bounds.right);
  const bottom = round(bounds.bottom);
  const stemWidth = Math.max(2, width * 0.23);
  const innerLeft = round(bounds.left + stemWidth);
  const innerRight = round(bounds.right - stemWidth);
  const diagonalRise = height * 0.42;
  const upperRight = round(bounds.bottom - diagonalRise);
  const lowerLeft = round(bounds.top + diagonalRise);

  return `M${left} ${top}H${innerLeft}L${innerRight} ${upperRight}V${top}H${right}V${bottom}H${innerRight}L${innerLeft} ${lowerLeft}V${bottom}H${left}Z`;
}

function boundsCenter(bounds: Bounds): Point {
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };
}

function isEllipticalBoundary(points: readonly Point[], bounds: Bounds): boolean {
  if (points.length < 8) return false;
  const center = boundsCenter(bounds);
  const rx = (bounds.right - bounds.left) / 2;
  const ry = (bounds.bottom - bounds.top) / 2;
  return points.every((point) => {
    const radius = Math.hypot(
      (point.x - center.x) / Math.max(rx, 0.01),
      (point.y - center.y) / Math.max(ry, 0.01)
    );
    return radius >= 0.84 && radius <= 1.16;
  });
}

function ellipsePath(bounds: Bounds, inset = 0): string {
  const left = bounds.left + inset;
  const top = bounds.top + inset;
  const right = bounds.right - inset;
  const bottom = bounds.bottom - inset;
  const cx = round((left + right) / 2);
  const cy = round((top + bottom) / 2);
  const rx = round((right - left) / 2);
  const ry = round((bottom - top) / 2);
  return `M${cx} ${round(cy - ry)}A${rx} ${ry} 0 1 1 ${cx} ${round(cy + ry)}A${rx} ${ry} 0 1 1 ${cx} ${round(cy - ry)}Z`;
}

interface ConcentricRing {
  d: string;
  inner: Bounds;
}

function regularConcentricRing(d: string, canvasSize: number): ConcentricRing | null {
  const subpaths = anchorSubpaths(parsePathD(d));
  if (!subpaths || subpaths.length !== 2) return null;
  const ordered = subpaths
    .map((points) => ({ points, bounds: pointsBounds(points) }))
    .sort((a, b) => {
      const areaA = (a.bounds.right - a.bounds.left) * (a.bounds.bottom - a.bounds.top);
      const areaB = (b.bounds.right - b.bounds.left) * (b.bounds.bottom - b.bounds.top);
      return areaB - areaA;
    });
  const outer = ordered[0].bounds;
  const outerWidth = outer.right - outer.left;
  const outerHeight = outer.bottom - outer.top;
  const outerCenter = boundsCenter(outer);
  if (
    Math.min(outerWidth, outerHeight) < canvasSize * 0.9 ||
    Math.min(outerWidth, outerHeight) / Math.max(outerWidth, outerHeight) < 0.92 ||
    !isEllipticalBoundary(ordered[0].points, outer)
  ) {
    return null;
  }

  // Stacked tracing can fold foreground silhouettes inward through the ring's
  // inner subpath. The outermost cardinal anchor still belongs to the circular
  // rim, while radial distances at diagonal polygon vertices would overstate
  // its radius. Use the largest single-axis extent to recover the rim exactly.
  const outerRx = outerWidth / 2;
  const outerRy = outerHeight / 2;
  const innerScale = Math.max(
    ...ordered[1].points.flatMap((point) => [
      Math.abs(point.x - outerCenter.x) / Math.max(outerRx, 0.01),
      Math.abs(point.y - outerCenter.y) / Math.max(outerRy, 0.01),
    ])
  );
  if (innerScale < 0.65 || innerScale > 0.95) return null;
  const inner: Bounds = {
    left: outerCenter.x - outerRx * innerScale,
    top: outerCenter.y - outerRy * innerScale,
    right: outerCenter.x + outerRx * innerScale,
    bottom: outerCenter.y + outerRy * innerScale,
  };

  return {
    // Half the seam stroke stays inside the viewBox instead of flattening the
    // outermost pixels at the canvas boundary.
    d: `${ellipsePath(outer, 0.25)}${ellipsePath(inner)}`,
    inner,
  };
}

function clusterCenters(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const value of sorted) {
    const group = groups[groups.length - 1];
    if (!group || value - group[group.length - 1] > tolerance) groups.push([value]);
    else group.push(value);
  }
  return groups.map((group) => group.reduce((sum, value) => sum + value, 0) / group.length);
}

function nearestCenter(value: number, centers: readonly number[], tolerance: number): number {
  let nearest = value;
  let distance = tolerance;
  for (const center of centers) {
    const nextDistance = Math.abs(center - value);
    if (nextDistance <= distance) {
      nearest = center;
      distance = nextDistance;
    }
  }
  return nearest;
}

function regularOrthogonalDetail(d: string, canvasSize: number): string | null {
  const segments = parsePathD(d);
  const moveCount = segments.filter((segment) => segment.cmd === 'M').length;
  const closeCount = segments.filter((segment) => segment.cmd === 'Z').length;
  const curveCount = segments.filter((segment) => segment.cmd === 'C' || segment.cmd === 'Q').length;
  if (moveCount !== 1 || closeCount !== 1 || curveCount > 2) return null;

  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (
    width < canvasSize * 0.08 ||
    height < canvasSize * 0.08 ||
    width > canvasSize * 0.35 ||
    height > canvasSize * 0.35
  ) {
    return null;
  }

  const anchors = segments.flatMap((segment) =>
    segment.cmd === 'Z' || segment.pts.length === 0 ? [] : [segment.pts[segment.pts.length - 1]]
  );
  let axisEdges = 0;
  let measuredEdges = 0;
  for (let index = 1; index < anchors.length; index++) {
    const dx = Math.abs(anchors[index].x - anchors[index - 1].x);
    const dy = Math.abs(anchors[index].y - anchors[index - 1].y);
    const longest = Math.max(dx, dy);
    if (longest < 0.01) continue;
    measuredEdges++;
    if (Math.min(dx, dy) / longest <= 0.22) axisEdges++;
  }
  if (measuredEdges === 0 || axisEdges / measuredEdges < 0.8) return null;

  const tolerance = Math.max(1.1, Math.min(width, height) * 0.05);
  const yCenters = clusterCenters(anchors.map((point) => point.y), tolerance);
  const straightened: PathSegment[] = segments.map((segment) => {
    if (segment.cmd === 'Z') return segment;
    const anchor = segment.pts[segment.pts.length - 1];
    const snapped = {
      x: anchor.x,
      y: nearestCenter(anchor.y, yCenters, tolerance),
    };
    return { cmd: segment.cmd === 'M' ? 'M' : 'L', pts: [snapped] };
  });

  for (let index = 1; index < straightened.length; index++) {
    const segment = straightened[index];
    const previous = straightened[index - 1];
    if (segment.cmd !== 'L' || previous.cmd === 'Z') continue;
    const a = previous.pts[previous.pts.length - 1];
    const b = segment.pts[0];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const longest = Math.max(dx, dy);
    if (longest < 0.01 || Math.min(dx, dy) / longest > 0.35) continue;
    if (dx < dy) b.x = a.x;
    else b.y = a.y;
  }

  const simplified: PathSegment[] = [];
  for (const segment of straightened) {
    if (segment.cmd !== 'L') {
      simplified.push(segment);
      continue;
    }
    const current = segment.pts[0];
    const last = simplified[simplified.length - 1];
    if (last && last.cmd !== 'Z') {
      const lastPoint = last.pts[last.pts.length - 1];
      if (Math.abs(lastPoint.x - current.x) < 0.01 && Math.abs(lastPoint.y - current.y) < 0.01) continue;
    }
    while (simplified.length >= 2) {
      const middle = simplified[simplified.length - 1];
      const previous = simplified[simplified.length - 2];
      if (middle.cmd !== 'L' || previous.cmd === 'Z') break;
      const a = previous.pts[previous.pts.length - 1];
      const b = middle.pts[0];
      const sameX = Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - current.x) < 0.01;
      const sameY = Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - current.y) < 0.01;
      if (!sameX && !sameY) break;
      simplified.pop();
    }
    simplified.push(segment);
  }

  return serializePathD(simplified, 2);
}

/**
 * Straighten small, thin, single-island bars in logo output while retaining
 * whichever end the tracer identified as rounded. This targets generic logo
 * details such as teeth, slots, and short rules; larger artwork is untouched.
 */
export function regularizeLogoDetails(svg: string): string {
  const viewBox = svg.match(/\bviewBox="[^"]*?([\d.]+)\s+([\d.]+)"/i);
  const canvasSize = viewBox ? Math.min(Number(viewBox[1]), Number(viewBox[2])) : 0;
  if (!Number.isFinite(canvasSize) || canvasSize <= 0) return svg;

  let innerBoundary: Bounds | null = null;
  let output = svg.replace(/<path\b([^>]*?)\bd="([^"]+)"([^>]*)>/g, (full, before: string, d: string, after: string) => {
    const ring = regularConcentricRing(d, canvasSize);
    if (ring && !innerBoundary) {
      innerBoundary = ring.inner;
      const attrs = `${before}${after}`
        .replace(/\s*fill-rule="[^"]*"/gi, '')
        .replace(/\s*\/\s*$/, '');
      const close = full.endsWith('/>') ? '/>' : '>';
      return `<path data-logo-ring="true"${attrs} d="${ring.d}" fill-rule="evenodd"${close}`;
    }
    const regularized =
      regularHorizontalBar(d, canvasSize) ??
      regularSmallCircle(d, canvasSize) ??
      regularLetterN(d, canvasSize) ??
      regularOrthogonalDetail(d, canvasSize) ??
      roundLargePolygon(d, canvasSize);
    return regularized ? `<path${before}d="${regularized}"${after}>` : full;
  });

  if (!innerBoundary) return output;

  const clipId = 'svgcraft-logo-inner-boundary';
  const boundary = innerBoundary as Bounds;
  const center = boundsCenter(boundary);
  const rx = round((boundary.right - boundary.left) / 2);
  const ry = round((boundary.bottom - boundary.top) / 2);
  const definition = `<defs><clipPath id="${clipId}"><ellipse cx="${round(center.x)}" cy="${round(center.y)}" rx="${rx}" ry="${ry}"/></clipPath></defs>`;
  output = output.replace(/<svg\b([^>]*)>/, (tag) => `${tag}${definition}`);
  output = output.replace(/<path\b[^>]*>/g, (tag) => {
    if (tag.includes('data-logo-ring="true"')) {
      return tag.replace(/\s*data-logo-ring="true"/, '');
    }
    if (tag.includes('clip-path=')) return tag;
    return tag.replace('<path', `<path clip-path="url(#${clipId})"`);
  });
  return output;
}
