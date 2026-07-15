import { sanitizeLabelText } from '@/lib/sanitize';

export interface LabelInfo {
  pathId: string;
  label: string;
  className: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const LABEL_GROUP_ATTR = 'data-label-group';

export function labelToClassName(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug ? `part-${slug}` : 'part';
}

function removeGeneratedPartClasses(el: Element): void {
  const nextClasses = (el.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((className) => className.length > 0 && !className.startsWith('part-'));

  if (nextClasses.length > 0) el.setAttribute('class', nextClasses.join(' '));
  else el.removeAttribute('class');
}

function addClassName(el: Element, className: string): void {
  const classes = new Set(
    (el.getAttribute('class') ?? '').split(/\s+/).filter((item) => item.length > 0)
  );
  classes.add(className);
  el.setAttribute('class', Array.from(classes).join(' '));
}

function getOrCreateLabelGroup(pathEl: SVGPathElement): SVGGElement {
  const parent = pathEl.parentElement;
  if (parent instanceof SVGGElement && parent.getAttribute(LABEL_GROUP_ATTR) === 'true') {
    return parent;
  }

  const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  group.setAttribute(LABEL_GROUP_ATTR, 'true');
  parent?.insertBefore(group, pathEl);
  group.appendChild(pathEl);
  return group;
}

export function addLabelToPath(pathEl: SVGPathElement, label: string): void {
  const sanitized = sanitizeLabelText(label);
  if (!sanitized) return;
  const className = labelToClassName(sanitized);

  pathEl.setAttribute('data-label', sanitized);
  removeGeneratedPartClasses(pathEl);
  addClassName(pathEl, className);

  const group = getOrCreateLabelGroup(pathEl);
  group.setAttribute('data-label', sanitized);
  group.setAttribute('aria-label', sanitized);
  removeGeneratedPartClasses(group);
  addClassName(group, className);

  // Create or update <title> element
  let titleEl = pathEl.querySelector<SVGTitleElement>('title');
  if (!titleEl) {
    titleEl = document.createElementNS(SVG_NS, 'title') as SVGTitleElement;
    pathEl.insertBefore(titleEl, pathEl.firstChild);
  }
  titleEl.textContent = sanitized;
}

export function removeLabelFromPath(pathEl: SVGPathElement): void {
  pathEl.removeAttribute('data-label');
  removeGeneratedPartClasses(pathEl);

  const parent = pathEl.parentElement;
  if (parent instanceof SVGGElement && parent.getAttribute(LABEL_GROUP_ATTR) === 'true') {
    parent.removeAttribute('data-label');
    parent.removeAttribute('aria-label');
    removeGeneratedPartClasses(parent);
  }

  const titleEl = pathEl.querySelector<SVGTitleElement>('title');
  if (titleEl) {
    titleEl.remove();
  }
}

export function getLabelFromPath(pathEl: SVGPathElement): string | null {
  return pathEl.getAttribute('data-label');
}

export function extractLabelsFromSvg(svg: SVGElement): LabelInfo[] {
  const labels: LabelInfo[] = [];
  let pathId = 0;

  svg.querySelectorAll('path').forEach((pathEl) => {
    const label = pathEl.getAttribute('data-label') ?? pathEl.closest('g[data-label]')?.getAttribute('data-label');
    if (label) {
      labels.push({
        pathId: `path-${pathId}`,
        label,
        className: labelToClassName(label),
      });
    }
    pathId++;
  });

  return labels;
}

export function generateLabelLegendComment(labels: LabelInfo[]): string {
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.label))).sort((a, b) =>
    a.localeCompare(b)
  );
  return `<!-- SVGcraft labels: ${uniqueLabels.join(', ')} -->`;
}

export function prependLabelLegend(svgString: string, labels: LabelInfo[]): string {
  if (labels.length === 0) return svgString;

  const legend = generateLabelLegendComment(labels);
  return legend + '\n' + svgString;
}
