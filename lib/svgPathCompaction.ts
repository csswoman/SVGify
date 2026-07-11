interface PathRecord {
  index: number;
  tag: string;
  d: string;
  fill: string | null;
  area: number;
  mergeable: boolean;
}

const PATH_RE = /<path\b[^>]*>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/g;

function readAttrs(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(tag)) !== null) {
    attrs.set(match[1], match[2]);
  }
  return attrs;
}

function pathBoundsArea(d: string): number {
  const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (numbers.length < 4) return 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function parsePaths(svg: string): PathRecord[] {
  return [...svg.matchAll(PATH_RE)].map((match, index) => {
    const tag = match[0];
    const attrs = readAttrs(tag);
    const d = attrs.get('d') ?? '';
    const fill = attrs.get('fill') ?? null;
    const hasLabel = attrs.has('data-label') || attrs.has('class') || attrs.has('id');

    return {
      index,
      tag,
      d,
      fill,
      area: pathBoundsArea(d),
      mergeable: d.length > 0 && fill !== null && fill !== 'none' && !hasLabel,
    };
  });
}

/**
 * A leading relative moveto (`m`) is treated as absolute only when it is the
 * first command of a path element. After concatenation it becomes relative to
 * the previous subpath and shifts geometry — often outside the viewBox.
 */
function ensureAbsoluteSubpathStart(d: string): string {
  return d.replace(/^\s*m/, 'M');
}

function mergedPathTag(fill: string, paths: PathRecord[]): string {
  const d = paths.map((path) => ensureAbsoluteSubpathStart(path.d)).join('');
  return `<path fill="${fill}" d="${d}"/>`;
}

function chooseKeepCount(paths: PathRecord[], targetCount: number): Set<number> {
  const sorted = [...paths].sort((a, b) => b.area - a.area);

  for (let keepCount = Math.min(paths.length, targetCount); keepCount >= 0; keepCount--) {
    const keep = new Set(sorted.slice(0, keepCount).map((path) => path.index));
    const rest = paths.filter((path) => !keep.has(path.index));
    const mergeGroups = new Set(rest.filter((path) => path.mergeable).map((path) => path.fill));
    const fixedRestCount = rest.filter((path) => !path.mergeable).length;

    if (keep.size + mergeGroups.size + fixedRestCount <= targetCount) {
      return keep;
    }
  }

  return new Set();
}

export function compactSvgPaths(svg: string, targetCount = 50): string {
  const paths = parsePaths(svg);
  const target = Math.max(1, Math.floor(targetCount));
  if (paths.length <= target) return svg;

  const keep = chooseKeepCount(paths, target);
  const tagsByIndex = new Array<string>(paths.length).fill('');
  const mergeGroups = new Map<string, PathRecord[]>();

  for (const path of paths) {
    if (keep.has(path.index) || !path.mergeable || !path.fill) {
      tagsByIndex[path.index] = path.tag;
      continue;
    }

    const group = mergeGroups.get(path.fill);
    if (group) group.push(path);
    else mergeGroups.set(path.fill, [path]);
  }

  for (const [fill, group] of mergeGroups) {
    tagsByIndex[group[0].index] = mergedPathTag(fill, group);
  }

  let i = 0;
  return svg.replace(PATH_RE, () => tagsByIndex[i++] ?? '');
}

export function countSvgPaths(svg: string): number {
  return (svg.match(PATH_RE) ?? []).length;
}
