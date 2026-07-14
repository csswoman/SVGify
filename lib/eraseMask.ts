const SVG_NS = 'http://www.w3.org/2000/svg';
const MASK_ID = 'svgcraft-erase-mask';
let stackEraseId = 0;

function directChild<T extends Element>(parent: Element, predicate: (el: Element) => el is T): T | null {
  for (const child of Array.from(parent.children)) {
    if (predicate(child)) return child;
  }
  return null;
}

function ensureEraseDefs(svgEl: SVGSVGElement): SVGDefsElement {
  let defs = directChild(svgEl, (el): el is SVGDefsElement =>
    el instanceof SVGDefsElement && el.getAttribute('data-svgcraft-erase-defs') === 'true'
  );

  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    defs.setAttribute('data-svgcraft-erase-defs', 'true');
    svgEl.insertBefore(defs, svgEl.firstChild);
  }

  return defs;
}

function setMaskBounds(mask: SVGMaskElement, svgEl: SVGSVGElement): void {
  const vb = svgEl.viewBox.baseVal;

  mask.setAttribute('x', String(vb.x));
  mask.setAttribute('y', String(vb.y));
  mask.setAttribute('width', String(vb.width));
  mask.setAttribute('height', String(vb.height));

  const keep = mask.querySelector<SVGRectElement>('[data-svgcraft-erase-base]');
  if (keep) {
    keep.setAttribute('x', String(vb.x));
    keep.setAttribute('y', String(vb.y));
    keep.setAttribute('width', String(vb.width));
    keep.setAttribute('height', String(vb.height));
  }
}

function createMask(svgEl: SVGSVGElement, id: string): SVGMaskElement {
  const defs = ensureEraseDefs(svgEl);
  const mask = document.createElementNS(SVG_NS, 'mask');
  mask.setAttribute('id', id);
  mask.setAttribute('maskUnits', 'userSpaceOnUse');

  const keep = document.createElementNS(SVG_NS, 'rect');
  keep.setAttribute('data-svgcraft-erase-base', 'true');
  keep.setAttribute('fill', '#fff');
  mask.appendChild(keep);
  defs.appendChild(mask);

  setMaskBounds(mask, svgEl);
  return mask;
}

export function ensureEraseMask(svgEl: SVGSVGElement): SVGMaskElement {
  const defs = ensureEraseDefs(svgEl);

  let mask = defs.querySelector<SVGMaskElement>(`#${MASK_ID}`);
  if (!mask) {
    mask = createMask(svgEl, MASK_ID);
  }

  setMaskBounds(mask, svgEl);

  let content = directChild(svgEl, (el): el is SVGGElement =>
    el instanceof SVGGElement && el.getAttribute('data-svgcraft-content') === 'true'
  );

  if (!content) {
    content = document.createElementNS(SVG_NS, 'g');
    content.setAttribute('data-svgcraft-content', 'true');
    content.setAttribute('mask', `url(#${MASK_ID})`);
    svgEl.appendChild(content);
  } else {
    content.setAttribute('mask', `url(#${MASK_ID})`);
  }

  const movable = Array.from(svgEl.childNodes).filter((node) => {
    if (node === content) return false;
    if (!(node instanceof Element)) return true;
    if (node === defs) return false;
    if (node.getAttribute('data-svgcraft-editor') === 'true') return false;
    return true;
  });

  for (const node of movable) {
    content.appendChild(node);
  }

  return mask;
}

export function clientPointToSvg(svgEl: SVGSVGElement, clientX: number, clientY: number): DOMPoint {
  const point = svgEl.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svgEl.getScreenCTM();
  return ctm ? point.matrixTransform(ctm.inverse()) : point;
}

export function clientPointToElement(el: SVGGraphicsElement, clientX: number, clientY: number): DOMPoint {
  const ownerSvg = el.ownerSVGElement;
  const point = ownerSvg?.createSVGPoint() ?? new DOMPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = el.getScreenCTM();
  return ctm ? point.matrixTransform(ctm.inverse()) : point;
}

function splitPathSubpaths(d: string): string[] {
  return d.match(/[Mm][^Mm]*/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

export function clickedSubpathD(
  svgEl: SVGSVGElement,
  path: SVGPathElement,
  clientX: number,
  clientY: number
): string {
  const fullD = path.getAttribute('d') ?? '';
  const subpaths = splitPathSubpaths(fullD);
  if (subpaths.length <= 1) return fullD;

  const parent = path.parentElement;
  if (!parent) return fullD;

  const fillRule = path.getAttribute('fill-rule');

  for (const subpath of subpaths) {
    const testPath = document.createElementNS(SVG_NS, 'path');
    testPath.setAttribute('d', subpath);
    testPath.setAttribute('fill', path.getAttribute('fill') ?? '#000');
    if (fillRule) testPath.setAttribute('fill-rule', fillRule);
    testPath.setAttribute('opacity', '0');
    testPath.setAttribute('pointer-events', 'none');
    testPath.setAttribute('data-svgcraft-editor', 'true');
    parent.appendChild(testPath);
    const point = clientPointToElement(testPath, clientX, clientY);
    const containsPoint = testPath.isPointInFill(point);
    testPath.remove();
    if (containsPoint) return subpath;
  }

  return fullD;
}

export function addEraseShape(svgEl: SVGSVGElement, d: string, fillRule?: string | null): void {
  const mask = ensureEraseMask(svgEl);
  const erase = document.createElementNS(SVG_NS, 'path');
  erase.setAttribute('d', d);
  erase.setAttribute('fill', '#000');
  if (fillRule) erase.setAttribute('fill-rule', fillRule);
  mask.appendChild(erase);
}

export function addStackEraseShape(
  svgEl: SVGSVGElement,
  targetPath: SVGPathElement,
  d: string,
  fillRule?: string | null
): void {
  const parent = targetPath.parentElement;
  if (!parent || parent.closest('defs') || parent.getAttribute('data-svgcraft-editor') === 'true') {
    return;
  }

  const mask = createMask(svgEl, `svgcraft-stack-erase-mask-${++stackEraseId}`);
  const erase = document.createElementNS(SVG_NS, 'path');
  erase.setAttribute('d', d);
  erase.setAttribute('fill', '#000');
  if (fillRule) erase.setAttribute('fill-rule', fillRule);
  mask.appendChild(erase);

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-svgcraft-stack-erase', 'true');
  group.setAttribute('mask', `url(#${mask.id})`);

  const siblings = Array.from(parent.childNodes);
  const targetIndex = siblings.indexOf(targetPath);
  if (targetIndex < 0) return;

  const first = siblings[0];
  parent.insertBefore(group, first);

  for (const node of siblings.slice(0, targetIndex + 1)) {
    if (node instanceof Element && node.getAttribute('data-svgcraft-editor') === 'true') continue;
    group.appendChild(node);
  }
}
