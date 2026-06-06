import { sanitizeLabelText } from '@/lib/sanitize';

export interface LabelInfo {
  pathId: string;
  label: string;
}

export function addLabelToPath(pathEl: SVGPathElement, label: string): void {
  const sanitized = sanitizeLabelText(label);
  if (!sanitized) return;

  pathEl.setAttribute('data-label', sanitized);

  // Create or update <title> element
  let titleEl = pathEl.querySelector<SVGTitleElement>('title');
  if (!titleEl) {
    titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title') as SVGTitleElement;
    pathEl.insertBefore(titleEl, pathEl.firstChild);
  }
  titleEl.textContent = sanitized;
}

export function removeLabelFromPath(pathEl: SVGPathElement): void {
  pathEl.removeAttribute('data-label');
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
    const label = pathEl.getAttribute('data-label');
    if (label) {
      labels.push({
        pathId: `path-${pathId}`,
        label,
      });
    }
    pathId++;
  });

  return labels;
}

export function generateLabelLegendComment(labels: LabelInfo[]): string {
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.label)));
  return `<!-- SVGcraft labels: ${uniqueLabels.join(', ')} -->`;
}

export function prependLabelLegend(svgString: string, labels: LabelInfo[]): string {
  if (labels.length === 0) return svgString;

  const legend = generateLabelLegendComment(labels);
  return legend + '\n' + svgString;
}
