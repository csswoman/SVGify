'use client';

import { useRef, useCallback } from 'react';

interface BrushEditorProps {
  svgEl: SVGSVGElement;
  /** Brush color in hex (the "paint" color). */
  color: string;
  /** Brush size in SVG user units. */
  size: number;
  /** Called after a stroke is committed, so the parent can snapshot. */
  onChange: () => void;
}

/**
 * Free-hand brush that paints strokes directly into the SVG as <path> elements.
 * Useful to touch up silhouettes — fill a gap or cover an unwanted area with a
 * chosen color. Strokes are real vector paths, so they stay crisp.
 */
export function BrushEditor({ svgEl, color, size, onChange }: BrushEditorProps) {
  const drawing = useRef<{ el: SVGPathElement; d: string } | null>(null);

  const toUser = useCallback(
    (clientX: number, clientY: number) => {
      const pt = svgEl.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return { x: clientX, y: clientY };
      const u = pt.matrixTransform(ctm.inverse());
      return { x: u.x, y: u.y };
    },
    [svgEl]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const u = toUser(e.clientX, e.clientY);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M${u.x} ${u.y}`;
    el.setAttribute('d', d);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', String(size));
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(el);
    drawing.current = { el, d };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const cur = drawing.current;
    if (!cur) return;
    const u = toUser(e.clientX, e.clientY);
    cur.d += `L${u.x} ${u.y}`;
    cur.el.setAttribute('d', cur.d);
  };

  const onPointerUp = () => {
    if (drawing.current) {
      drawing.current = null;
      onChange();
    }
  };

  const vb = svgEl.viewBox.baseVal;

  // A transparent capture rectangle over the whole canvas catches the strokes.
  return (
    <g data-svgcraft-editor aria-hidden="true">
      <rect
        x={vb.x}
        y={vb.y}
        width={vb.width}
        height={vb.height}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </g>
  );
}
