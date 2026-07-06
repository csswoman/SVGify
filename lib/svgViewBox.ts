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

/** Read intrinsic dimensions from an SVG string without mounting. */
export function readViewBoxFromSvgString(svgString: string): { w: number; h: number } | null {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  if (doc.documentElement.tagName === 'parsererror') return null;

  const svg = doc.documentElement;
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { w: parts[2], h: parts[3] };
    }
  }

  const width = svg.getAttribute('width');
  const height = svg.getAttribute('height');
  if (width && height) {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (w > 0 && h > 0) return { w, h };
  }

  return null;
}

export function zoomViewBoxSize(base: SvgBaseViewBox, scale: number): { w: number; h: number } {
  return { w: base.w / scale, h: base.h / scale };
}

/** Offset that keeps the artwork centered at the given zoom scale. */
export function centeredZoomOffset(base: SvgBaseViewBox, scale: number): { x: number; y: number } {
  const { w, h } = zoomViewBoxSize(base, scale);
  return { x: (base.w - w) / 2, y: (base.h - h) / 2 };
}

/** Keep the current viewport center fixed when changing zoom scale. */
export function zoomOffsetPreservingCenter(
  base: SvgBaseViewBox,
  oldScale: number,
  newScale: number,
  currentOffset: { x: number; y: number }
): { x: number; y: number } {
  const oldSize = zoomViewBoxSize(base, oldScale);
  const centerX = currentOffset.x + oldSize.w / 2;
  const centerY = currentOffset.y + oldSize.h / 2;
  const newSize = zoomViewBoxSize(base, newScale);
  return clampZoomOffset(
    base,
    newScale,
    centerX - newSize.w / 2,
    centerY - newSize.h / 2
  );
}

export function clampZoomOffset(
  base: SvgBaseViewBox,
  scale: number,
  ox: number,
  oy: number
): { x: number; y: number } {
  const { w, h } = zoomViewBoxSize(base, scale);
  const minX = Math.min(0, base.w - w);
  const maxX = Math.max(0, base.w - w);
  const minY = Math.min(0, base.h - h);
  const maxY = Math.max(0, base.h - h);
  return {
    x: Math.min(maxX, Math.max(minX, ox)),
    y: Math.min(maxY, Math.max(minY, oy)),
  };
}

/** Serialize while temporarily restoring the baseline viewBox (zoom is UI-only). */
export function serializeSvgAtBaseViewBox(svg: SVGSVGElement, base: SvgBaseViewBox): string {
  const current = svg.getAttribute('viewBox');
  svg.setAttribute('viewBox', `${base.x} ${base.y} ${base.w} ${base.h}`);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-svgcraft-editor]').forEach((el) => el.remove());
  const serialized = new XMLSerializer().serializeToString(clone);
  if (current !== null) {
    svg.setAttribute('viewBox', current);
  } else {
    svg.removeAttribute('viewBox');
  }
  return serialized;
}
