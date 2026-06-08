import type { SvgBaseViewBox } from './svgViewBox';

const EDITOR_SELECTOR = '[data-svgcraft-editor]';

/** Strip transient editor overlays and hover styles before exporting SVG text. */
export function serializeSvgElement(svg: SVGSVGElement, baseViewBox?: SvgBaseViewBox): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  clone.querySelectorAll(EDITOR_SELECTOR).forEach((el) => el.remove());

  clone.querySelectorAll('path[data-hl]').forEach((path) => {
    path.removeAttribute('data-hl');
    (path as SVGPathElement).style.opacity = '';
    (path as SVGPathElement).style.outline = '';
  });

  if (baseViewBox) {
    clone.setAttribute(
      'viewBox',
      `${baseViewBox.x} ${baseViewBox.y} ${baseViewBox.w} ${baseViewBox.h}`
    );
  }

  return new XMLSerializer().serializeToString(clone);
}
