import type { SvgBaseViewBox } from './svgViewBox';

const EDITOR_SELECTOR = '[data-svgcraft-editor]';

/** Strip transient editor overlays and hover styles before exporting SVG text. */
export function serializeSvgElement(svg: SVGSVGElement, baseViewBox?: SvgBaseViewBox): string {
  const hasEditorArtifacts =
    svg.querySelector(EDITOR_SELECTOR) !== null || svg.querySelector('path[data-hl]') !== null;

  if (!hasEditorArtifacts) {
    const previousViewBox = svg.getAttribute('viewBox');
    if (baseViewBox) {
      svg.setAttribute(
        'viewBox',
        `${baseViewBox.x} ${baseViewBox.y} ${baseViewBox.w} ${baseViewBox.h}`
      );
    }

    const serialized = new XMLSerializer().serializeToString(svg);

    if (baseViewBox) {
      if (previousViewBox === null) svg.removeAttribute('viewBox');
      else svg.setAttribute('viewBox', previousViewBox);
    }

    return serialized;
  }

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
