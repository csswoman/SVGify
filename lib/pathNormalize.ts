type PathDataSegment = {
  type: number;
  values: number[];
};

type PathDataCapable = SVGPathElement & {
  getPathData?: (options?: { normalize?: boolean }) => PathDataSegment[];
};

const PATH_MOVETO = 0;
const PATH_LINETO = 1;
const PATH_CURVETO_CUBIC = 2;
const PATH_CURVETO_QUADRATIC = 3;
const PATH_CLOSEPATH = 4;

function pathDataNeedsNormalization(d: string): boolean {
  return /[aAsStT]/.test(d);
}

function pathDataSegmentToD(segment: PathDataSegment): string {
  const [a, b, c, d, e, f] = segment.values;
  switch (segment.type) {
    case PATH_MOVETO:
      return `M${a} ${b}`;
    case PATH_LINETO:
      return `L${a} ${b}`;
    case PATH_CURVETO_CUBIC:
      return `C${a} ${b} ${c} ${d} ${e} ${f}`;
    case PATH_CURVETO_QUADRATIC:
      return `Q${a} ${b} ${c} ${d}`;
    case PATH_CLOSEPATH:
      return 'Z';
    default:
      return '';
  }
}

/**
 * Convert arcs/smooth curves to absolute M/L/C/Q using the browser path API.
 * Returns null when normalization is unnecessary or unavailable.
 */
export function normalizeEditablePathD(pathEl: SVGPathElement): string | null {
  const raw = pathEl.getAttribute('d') ?? '';
  if (!pathDataNeedsNormalization(raw)) return null;

  const getPathData = (pathEl as PathDataCapable).getPathData;
  if (!getPathData) return null;

  const segments = getPathData.call(pathEl, { normalize: true });
  if (!segments.length) return null;

  const normalized = segments.map(pathDataSegmentToD).join('');
  return normalized === raw ? null : normalized;
}

export function preparePathForNodeEditing(pathEl: SVGPathElement): string {
  return normalizeEditablePathD(pathEl) ?? pathEl.getAttribute('d') ?? '';
}
