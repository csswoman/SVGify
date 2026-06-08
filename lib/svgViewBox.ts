export interface SvgBaseViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function readSvgViewBox(svg: SVGSVGElement): SvgBaseViewBox {
  const vb = svg.viewBox.baseVal;
  return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
}

/** Serialize while temporarily restoring the baseline viewBox (zoom is UI-only). */
export function serializeSvgAtBaseViewBox(svg: SVGSVGElement, base: SvgBaseViewBox): string {
  const current = svg.getAttribute('viewBox');
  svg.setAttribute('viewBox', `${base.x} ${base.y} ${base.w} ${base.h}`);
  const serialized = new XMLSerializer().serializeToString(svg);
  if (current !== null) {
    svg.setAttribute('viewBox', current);
  } else {
    svg.removeAttribute('viewBox');
  }
  return serialized;
}
