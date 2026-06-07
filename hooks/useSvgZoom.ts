import { useCallback, useRef, useState } from 'react';

export interface ZoomState {
  scale: number;
}

/**
 * Zoom + pan controls for a mounted <svg>, driven by its viewBox.
 * Keeps the original viewBox as the "fit" baseline and scales/translates from it.
 */
export function useSvgZoom() {
  const baseRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);
  const offset = useRef({ x: 0, y: 0 });

  // Register the svg and capture its baseline viewBox.
  const attach = useCallback((svg: SVGSVGElement | null) => {
    svgRef.current = svg;
    if (svg) {
      const vb = svg.viewBox.baseVal;
      baseRef.current = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
      offset.current = { x: 0, y: 0 };
      setScale(1);
    }
  }, []);

  const apply = useCallback((newScale: number, ox: number, oy: number) => {
    const svg = svgRef.current;
    const base = baseRef.current;
    if (!svg || !base) return;
    const w = base.w / newScale;
    const h = base.h / newScale;
    svg.setAttribute('viewBox', `${base.x + ox} ${base.y + oy} ${w} ${h}`);
  }, []);

  const setZoom = useCallback(
    (next: number) => {
      const clamped = Math.min(8, Math.max(1, next));
      const base = baseRef.current;
      if (base) {
        // Clamp offset so we don't pan outside the image.
        const w = base.w / clamped;
        const h = base.h / clamped;
        offset.current.x = Math.min(base.w - w, Math.max(0, offset.current.x));
        offset.current.y = Math.min(base.h - h, Math.max(0, offset.current.y));
      }
      setScale(clamped);
      apply(clamped, offset.current.x, offset.current.y);
    },
    [apply]
  );

  const zoomIn = useCallback(() => setZoom(scale * 1.3), [scale, setZoom]);
  const zoomOut = useCallback(() => setZoom(scale / 1.3), [scale, setZoom]);
  const reset = useCallback(() => {
    offset.current = { x: 0, y: 0 };
    setZoom(1);
  }, [setZoom]);

  const pan = useCallback(
    (dxUser: number, dyUser: number) => {
      const base = baseRef.current;
      if (!base) return;
      const w = base.w / scale;
      const h = base.h / scale;
      offset.current.x = Math.min(base.w - w, Math.max(0, offset.current.x - dxUser));
      offset.current.y = Math.min(base.h - h, Math.max(0, offset.current.y - dyUser));
      apply(scale, offset.current.x, offset.current.y);
    },
    [scale, apply]
  );

  return { attach, scale, zoomIn, zoomOut, reset, setZoom, pan };
}
