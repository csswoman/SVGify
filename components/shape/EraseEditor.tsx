'use client';

import { useCallback, useEffect, useRef } from 'react';
import { clientPointToSvg, ensureEraseMask } from '@/lib/eraseMask';

interface EraseEditorProps {
  svgEl: SVGSVGElement;
  size: number;
  onChange: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function EraseEditor({ svgEl, size, onChange }: EraseEditorProps) {
  const drawing = useRef<{ el: SVGPathElement; d: string } | null>(null);
  const maskRef = useRef<SVGMaskElement | null>(null);

  useEffect(() => {
    maskRef.current = ensureEraseMask(svgEl);
  }, [svgEl]);

  const toUser = useCallback(
    (clientX: number, clientY: number) => {
      const point = clientPointToSvg(svgEl, clientX, clientY);
      return { x: point.x, y: point.y };
    },
    [svgEl]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const mask = maskRef.current ?? ensureEraseMask(svgEl);
    maskRef.current = mask;
    const u = toUser(e.clientX, e.clientY);
    const el = document.createElementNS(SVG_NS, 'path');
    const d = `M${u.x} ${u.y}`;
    el.setAttribute('d', d);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', '#000');
    el.setAttribute('stroke-width', String(size));
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    mask.appendChild(el);
    drawing.current = { el, d };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cur = drawing.current;
    if (!cur) return;
    const u = toUser(e.clientX, e.clientY);
    cur.d += `L${u.x} ${u.y}`;
    cur.el.setAttribute('d', cur.d);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!drawing.current) return;
    drawing.current = null;
    onChange();
  };

  const vb = svgEl.viewBox.baseVal;

  return (
    <g data-svgcraft-editor="true" aria-hidden="true">
      <rect
        x={vb.x}
        y={vb.y}
        width={vb.width}
        height={vb.height}
        fill="transparent"
        style={{ cursor: 'crosshair', pointerEvents: 'all' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </g>
  );
}
