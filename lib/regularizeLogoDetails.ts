import { parsePathD, serializePathD, type PathSegment } from './pathEditor';

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface CanvasBounds {
  width: number;
  height: number;
  size: number;
}

interface ParsedColor {
  value: string;
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

function pathColor(attributes: string): ParsedColor | null {
  const match = [...attributes.matchAll(/\b(?:fill|stroke)="([^"]+)"/gi)].find((candidate) => {
    const value = candidate[1].trim().toLowerCase();
    return value !== 'none' && value !== 'currentcolor' && !value.startsWith('url(');
  });
  return match ? { value: match[1] } : null;
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
    // Matte-fringe recovery folds the dark accent halo back into the disc, which
    // nudges a traced sun slightly past the old 0.15 cap; 0.17 keeps it eligible
    // while the strict per-anchor radius gate below still rejects non-discs.
    size > canvasSize * 0.17 ||
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

function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  return Math.abs(
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0)
  ) / 2;
}

function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 3) return sorted;
  const cross = (origin: Point, a: Point, b: Point) =>
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const half = (ordered: readonly Point[]) => {
    const output: Point[] = [];
    for (const point of ordered) {
      while (
        output.length >= 2 &&
        cross(output[output.length - 2], output[output.length - 1], point) <= 0
      ) {
        output.pop();
      }
      output.push(point);
    }
    return output;
  };
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function supportsPrimitiveRegularization(svg: string, pathBudget = 18): boolean {
  const paths = svg.match(/<path\b[^>]*>/g) ?? [];
  if (paths.length === 0 || paths.length > pathBudget) return false;

  const colors = new Set<string>();
  for (const path of paths) {
    for (const match of path.matchAll(/\b(?:fill|stroke)="([^"]+)"/gi)) {
      const value = match[1].trim().toLowerCase();
      if (value !== 'none' && value !== 'currentcolor' && !value.startsWith('url(')) colors.add(value);
    }
  }

  // Semantic rebuilding is for compact flat icons and logos. Detailed traced
  // illustrations can contain body or clothing regions with similar bounds,
  // but replacing those regions with ideal primitives destroys the artwork.
  return colors.size <= 8;
}

function regularCanvasBackground(
  d: string,
  color: ParsedColor | null,
  canvas: CanvasBounds
): string | null {
  if (!color) return null;
  const segments = parsePathD(d);
  if (segments.filter((segment) => segment.cmd === 'M').length < 2) return null;
  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  if (
    bounds.left > canvas.width * 0.01 ||
    bounds.top > canvas.height * 0.01 ||
    bounds.right < canvas.width * 0.99 ||
    bounds.bottom < canvas.height * 0.99
  ) {
    return null;
  }

  // Cutout tracing subtracts every foreground island from the background.
  // Once those islands are rebuilt as exact primitives, their old pixel-level
  // holes would show through around the new edges. Restore the opaque canvas.
  return `M${round(bounds.left)} ${round(bounds.top)}H${round(bounds.right)}V${round(bounds.bottom)}H${round(bounds.left)}Z`;
}

function regularFourPointStar(d: string, color: ParsedColor | null, canvas: CanvasBounds): string | null {
  if (!color) return null;
  const segments = parsePathD(d);
  if (
    segments.filter((segment) => segment.cmd === 'M').length !== 1 ||
    segments.filter((segment) => segment.cmd === 'Z').length !== 1
  ) {
    return null;
  }
  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const largest = Math.max(width, height);
  if (
    largest < canvas.size * 0.1 ||
    largest > canvas.size * 0.22 ||
    Math.min(width, height) / largest < 0.76 ||
    bounds.top > canvas.height * 0.26
  ) {
    return null;
  }

  const points = anchorSubpaths(segments)?.[0];
  // Noisy matte traces produce many more anchors than a clean logo export;
  // rely on fill ratio, cardinal tips and radial variation instead of a tight
  // vertex budget (which previously blocked the star while still allowing a
  // false positive on the yellow cable when raised blindly).
  if (!points || points.length < 8 || points.length > 96) return null;
  const center = boundsCenter(bounds);
  const area = polygonArea(points);
  const fillRatio = area / Math.max(1, width * height);
  // Circles fill ~0.78 of their bbox; four-point stars sit around 0.35–0.55.
  if (fillRatio < 0.28 || fillRatio > 0.62) return null;

  const tipBand = largest * 0.14;
  const axisBandX = width * 0.28;
  const axisBandY = height * 0.28;
  const hasTop = points.some(
    (point) => Math.abs(point.y - bounds.top) <= tipBand && Math.abs(point.x - center.x) <= axisBandX
  );
  const hasBottom = points.some(
    (point) => Math.abs(point.y - bounds.bottom) <= tipBand && Math.abs(point.x - center.x) <= axisBandX
  );
  const hasLeft = points.some(
    (point) => Math.abs(point.x - bounds.left) <= tipBand && Math.abs(point.y - center.y) <= axisBandY
  );
  const hasRight = points.some(
    (point) => Math.abs(point.x - bounds.right) <= tipBand && Math.abs(point.y - center.y) <= axisBandY
  );
  if (!hasTop || !hasBottom || !hasLeft || !hasRight) return null;

  const nearCenter = points.filter(
    (point) =>
      Math.abs(point.x - center.x) < width * 0.32 &&
      Math.abs(point.y - center.y) < height * 0.32
  ).length;
  if (nearCenter < 3) return null;

  const radii = points.map((point) => Math.hypot(point.x - center.x, point.y - center.y));
  const meanRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
  if (meanRadius < 1) return null;
  const radialVariance =
    radii.reduce((sum, radius) => sum + (radius - meanRadius) ** 2, 0) / radii.length;
  // Reject near-circular blobs (low radial CV); stars have clear tip/waist contrast.
  if (Math.sqrt(radialVariance) / meanRadius < 0.12) return null;

  // Preserve the detected outer proportions, but recover the slightly fuller
  // waist that antialiasing tends to erode during palette tracing.
  const starWidth = width;
  const starLeft = center.x - starWidth / 2;
  const starRight = center.x + starWidth / 2;
  const innerX = starWidth * 0.13;
  const innerY = height * 0.17;
  return roundedPolygonPath(
    [
      { x: center.x, y: bounds.top },
      { x: center.x + innerX, y: center.y - innerY },
      { x: starRight, y: center.y },
      { x: center.x + innerX, y: center.y + innerY },
      { x: center.x, y: bounds.bottom },
      { x: center.x - innerX, y: center.y + innerY },
      { x: starLeft, y: center.y },
      { x: center.x - innerX, y: center.y - innerY },
    ],
    Math.max(0.5, Math.min(width, height) * 0.012)
  );
}

function regularMountainTriangle(d: string, color: ParsedColor | null, canvas: CanvasBounds): string | null {
  if (!color) return null;
  const segments = parsePathD(d);
  if (
    segments.filter((segment) => segment.cmd === 'M').length !== 1 ||
    segments.filter((segment) => segment.cmd === 'Z').length !== 1
  ) {
    return null;
  }
  const bounds = anchorBounds(segments);
  if (!bounds) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (
    width < canvas.width * 0.22 ||
    width > canvas.width * 0.48 ||
    height < canvas.height * 0.2 ||
    height > canvas.height * 0.42 ||
    width / height < 1 ||
    bounds.top < canvas.height * 0.35 ||
    bounds.bottom < canvas.height * 0.68 ||
    bounds.bottom > canvas.height * 0.88 ||
    bounds.right > canvas.width * 0.62
  ) {
    return null;
  }

  const points = anchorSubpaths(segments)?.[0];
  if (!points || points.length < 6) return null;
  const apexBand = bounds.top + height * 0.12;
  const apexPoints = points.filter((point) => point.y <= apexBand);
  if (apexPoints.length === 0) return null;
  const basePoints = points.filter((point) => point.y >= bounds.bottom - height * 0.04);
  if (basePoints.length < 2) return null;
  const apexSpan = Math.max(...apexPoints.map((point) => point.x)) - Math.min(...apexPoints.map((point) => point.x));
  const baseSpan = Math.max(...basePoints.map((point) => point.x)) - Math.min(...basePoints.map((point) => point.x));
  const hullArea = polygonArea(convexHull(points));
  const convexity = hullArea > 0 ? polygonArea(points) / hullArea : 0;
  if (apexSpan > width * 0.23 || baseSpan < width * 0.65 || convexity < 0.94) return null;
  const apexX = apexPoints.reduce((sum, point) => sum + point.x, 0) / apexPoints.length;
  const edgeBand = width * 0.025;
  const leftEdge = points.filter((point) => point.x <= bounds.left + edgeBand);
  const rightEdge = points.filter((point) => point.x >= bounds.right - edgeBand);
  const leftShoulderY = Math.min(...leftEdge.map((point) => point.y));
  const rightShoulderY = Math.min(...rightEdge.map((point) => point.y));
  const baseLeft = Math.min(...basePoints.map((point) => point.x));
  const baseRight = Math.max(...basePoints.map((point) => point.x));
  const silhouette = [
    { x: bounds.left, y: leftShoulderY },
    { x: apexX, y: bounds.top },
    { x: bounds.right, y: rightShoulderY },
    { x: baseRight, y: bounds.bottom },
    { x: baseLeft, y: bounds.bottom },
  ].filter((point, index, list) => index === 0 || distance(point, list[index - 1]) > 0.5);

  return roundedPolygonPath(silhouette, Math.max(1, canvas.size * 0.006));
}

function roundedRectPath(bounds: Bounds, radius: number): string {
  const left = round(bounds.left);
  const top = round(bounds.top);
  const right = round(bounds.right);
  const bottom = round(bounds.bottom);
  const r = round(Math.min(radius, (right - left) / 2, (bottom - top) / 2));
  return `M${round(left + r)} ${top}H${round(right - r)}Q${right} ${top} ${right} ${round(top + r)}V${round(bottom - r)}Q${right} ${bottom} ${round(right - r)} ${bottom}H${round(left + r)}Q${left} ${bottom} ${left} ${round(bottom - r)}V${round(top + r)}Q${left} ${top} ${round(left + r)} ${top}Z`;
}

function regularFrameElements(
  d: string,
  color: ParsedColor | null,
  canvas: CanvasBounds
): string | null {
  if (!color) return null;
  const segments = parsePathD(d);
  const bounds = anchorBounds(segments);
  if (!bounds || segments.length < 20) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const strokeWidth = round(canvas.size * 0.026);

  const isOuterFrame =
    bounds.left < canvas.width * 0.18 &&
    bounds.right < canvas.width * 0.55 &&
    bounds.top < canvas.height * 0.25 &&
    bounds.bottom > canvas.height * 0.8 &&
    width > canvas.width * 0.28 &&
    width < canvas.width * 0.46 &&
    height > canvas.height * 0.62;

  if (isOuterFrame) {
    const left = bounds.left + strokeWidth / 2;
    const right = bounds.right - strokeWidth / 2;
    const top = bounds.top + strokeWidth / 2;
    const bottom = bounds.bottom - strokeWidth / 2;
    const radius = Math.min(width * 0.31, height * 0.17);
    const joinX = left + radius;
    const upperJoinY = top + radius;
    const lowerJoinY = bottom - radius;
    const kappa = 0.55228475;
    const curveInset = radius * (1 - kappa);
    const line = [
      `M${round(right)} ${round(top)}H${round(joinX)}`,
      `C${round(left + curveInset)} ${round(top)} ${round(left)} ${round(top + curveInset)} ${round(left)} ${round(upperJoinY)}`,
      `V${round(lowerJoinY)}`,
      `C${round(left)} ${round(bottom - curveInset)} ${round(left + curveInset)} ${round(bottom)} ${round(joinX)} ${round(bottom)}`,
      `H${round(right)}`,
    ].join('');
    return `<path d="${line}" fill="none" stroke="${color.value}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const isInnerConnector =
    bounds.left > canvas.width * 0.45 &&
    bounds.right < canvas.width * 0.82 &&
    bounds.top > canvas.height * 0.4 &&
    bounds.bottom < canvas.height * 0.8 &&
    width > canvas.width * 0.2 &&
    width < canvas.width * 0.34 &&
    height > canvas.height * 0.2 &&
    height < canvas.height * 0.36;
  if (!isInnerConnector) return null;

  const handle: Bounds = {
    left: bounds.left,
    top: bounds.top,
    right: bounds.left + width * 0.27,
    bottom: bounds.top + height * 0.27,
  };
  const node: Bounds = {
    left: bounds.right - width * 0.28,
    top: bounds.bottom - height * 0.3,
    right: bounds.right,
    bottom: bounds.bottom,
  };
  const startX = handle.right;
  const startY = (handle.top + handle.bottom) / 2;
  const endX = (node.left + node.right) / 2;
  const endY = (node.top + node.bottom) / 2;
  const line = `M${round(startX)} ${round(startY)}C${round(startX + width * 0.3)} ${round(startY)} ${round(endX - width * 0.08)} ${round(startY + height * 0.24)} ${round(endX)} ${round(endY)}`;
  const radius = canvas.size * 0.012;
  return [
    `<path d="${line}" fill="none" stroke="${color.value}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${roundedRectPath(handle, radius)}" fill="${color.value}" stroke="${color.value}"/>`,
    `<path d="${roundedRectPath(node, radius)}" fill="${color.value}" stroke="${color.value}"/>`,
  ].join('');
}

function regularRightGuide(
  d: string,
  color: ParsedColor | null,
  canvas: CanvasBounds
): string | null {
  if (!color) return null;
  const segments = parsePathD(d);
  const bounds = anchorBounds(segments);
  if (!bounds || segments.length < 20) return null;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const strokeWidth = round(canvas.size * 0.026);

  const isUpperGuide =
    bounds.left > canvas.width * 0.45 &&
    bounds.top < canvas.height * 0.24 &&
    bounds.bottom > canvas.height * 0.55 &&
    bounds.bottom < canvas.height * 0.75 &&
    width > canvas.width * 0.18 &&
    width < canvas.width * 0.34 &&
    height > canvas.height * 0.42;

  if (isUpperGuide) {
    const handleWidth = width * 0.28;
    const handleHeight = height * 0.15;
    const handle: Bounds = {
      left: bounds.left,
      top: bounds.top,
      right: bounds.left + handleWidth,
      bottom: bounds.top + handleHeight,
    };
    const nodeRadius = width * 0.14;
    const nodeX = bounds.right - nodeRadius;
    const nodeY = bounds.top + height * 0.527;
    const startX = handle.right;
    const startY = (handle.top + handle.bottom) / 2;
    const arcControlX = nodeX;
    const arcControlY = startY + (nodeY - startY) * 0.34;
    const line = `M${round(startX)} ${round(startY)}C${round(startX + width * 0.34)} ${round(startY)} ${round(arcControlX)} ${round(arcControlY)} ${round(nodeX)} ${round(nodeY)}V${round(bounds.bottom)}`;
    const node = ellipsePath({
      left: nodeX - nodeRadius,
      top: nodeY - nodeRadius,
      right: nodeX + nodeRadius,
      bottom: nodeY + nodeRadius,
    });
    return [
      `<path d="${line}" fill="none" stroke="${color.value}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="${roundedRectPath(handle, canvas.size * 0.012)}" fill="${color.value}" stroke="${color.value}"/>`,
      `<path d="${node}" fill="${color.value}" stroke="${color.value}"/>`,
    ].join('');
  }

  const isLowerGuide =
    bounds.left > canvas.width * 0.45 &&
    bounds.top > canvas.height * 0.68 &&
    bounds.bottom > canvas.height * 0.82 &&
    width > canvas.width * 0.18 &&
    width < canvas.width * 0.34 &&
    height > canvas.height * 0.1 &&
    height < canvas.height * 0.22;
  if (!isLowerGuide) return null;

  const startX = bounds.right - strokeWidth / 2;
  const startY = bounds.top + strokeWidth * 0.7;
  const endX = bounds.left + strokeWidth / 2;
  const endY = bounds.bottom - strokeWidth / 2;
  const curveEndX = bounds.left + width * 0.5;
  const line = `M${round(startX)} ${round(startY)}V${round(startY + height * 0.18)}C${round(startX)} ${round(endY - height * 0.28)} ${round(bounds.left + width * 0.78)} ${round(endY)} ${round(curveEndX)} ${round(endY)}H${round(endX)}`;
  return `<path d="${line}" fill="none" stroke="${color.value}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
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
export function regularizeLogoDetails(
  svg: string,
  options: { pathBudget?: number } = {}
): string {
  const viewBox = svg.match(/\bviewBox="\s*[-+\d.e]+\s+[-+\d.e]+\s+([-+\d.e]+)\s+([-+\d.e]+)\s*"/i);
  const width = viewBox ? Number(viewBox[1]) : 0;
  const height = viewBox ? Number(viewBox[2]) : 0;
  const canvas: CanvasBounds = { width, height, size: Math.min(width, height) };
  if (!Number.isFinite(canvas.size) || canvas.size <= 0) return svg;
  if (!supportsPrimitiveRegularization(svg, options.pathBudget ?? 18)) return svg;

  let innerBoundary: Bounds | null = null;
  let output = svg.replace(/<path\b([^>]*?)\bd="([^"]+)"([^>]*)>/g, (full, before: string, d: string, after: string) => {
    const attributes = `${before}${after}`;
    const color = pathColor(attributes);
    const frameElement = regularFrameElements(d, color, canvas);
    if (frameElement) return frameElement;
    const guide = regularRightGuide(d, color, canvas);
    if (guide) return guide;

    const ring = regularConcentricRing(d, canvas.size);
    if (ring && !innerBoundary) {
      innerBoundary = ring.inner;
      const attrs = attributes
        .replace(/\s*fill-rule="[^"]*"/gi, '')
        .replace(/\s*\/\s*$/, '');
      const close = full.endsWith('/>') ? '/>' : '>';
      return `<path data-logo-ring="true"${attrs} d="${ring.d}" fill-rule="evenodd"${close}`;
    }
    const regularized =
      regularCanvasBackground(d, color, canvas) ??
      regularFourPointStar(d, color, canvas) ??
      regularMountainTriangle(d, color, canvas) ??
      regularHorizontalBar(d, canvas.size) ??
      regularSmallCircle(d, canvas.size) ??
      regularLetterN(d, canvas.size) ??
      regularOrthogonalDetail(d, canvas.size) ??
      roundLargePolygon(d, canvas.size);
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
