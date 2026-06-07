'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  parsePathD,
  serializePathD,
  getEditableNodes,
  moveNode,
  type PathSegment,
  type EditableNode,
} from '@/lib/pathEditor';

interface NodeEditorProps {
  /** The selected path element being edited (lives in the mounted SVG). */
  pathEl: SVGPathElement;
  /** The owning <svg> (for coordinate mapping). */
  svgEl: SVGSVGElement;
  /** Called after each edit with the new `d`, so the parent can snapshot. */
  onChange: () => void;
}

/**
 * Overlay of draggable node handles for a single path. Renders SVG circles
 * positioned over each anchor point; dragging rewrites the path's `d`.
 */
export function NodeEditor({ pathEl, svgEl, onChange }: NodeEditorProps) {
  const [segs, setSegs] = useState<PathSegment[]>(() => parsePathD(pathEl.getAttribute('d') ?? ''));
  const [nodes, setNodes] = useState<EditableNode[]>(() => getEditableNodes(segs));
  const dragging = useRef<{ node: EditableNode; lastX: number; lastY: number } | null>(null);

  // Re-parse if the path element changes.
  useEffect(() => {
    const parsed = parsePathD(pathEl.getAttribute('d') ?? '');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-parse when the selected path changes
    setSegs(parsed);
    setNodes(getEditableNodes(parsed));
  }, [pathEl]);

  // Map a client (screen) coordinate to SVG user units.
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

  const onPointerDown = (node: EditableNode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const u = toUser(e.clientX, e.clientY);
    dragging.current = { node, lastX: u.x, lastY: u.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragging.current;
    if (!drag) return;
    const u = toUser(e.clientX, e.clientY);
    const dx = u.x - drag.lastX;
    const dy = u.y - drag.lastY;
    drag.lastX = u.x;
    drag.lastY = u.y;

    setSegs((prev) => {
      const updated = moveNode(prev, drag.node, dx, dy);
      pathEl.setAttribute('d', serializePathD(updated));
      return updated;
    });
    setNodes((prev) =>
      prev.map((n) =>
        n.segIndex === drag.node.segIndex && n.ptIndex === drag.node.ptIndex
          ? { ...n, x: n.x + dx, y: n.y + dy }
          : n
      )
    );
    // keep the dragged node reference in sync
    drag.node = { ...drag.node, x: drag.node.x + dx, y: drag.node.y + dy };
  };

  const onPointerUp = () => {
    if (dragging.current) {
      dragging.current = null;
      onChange();
    }
  };

  // Size handles relative to the viewBox so they stay visible at any zoom.
  const vb = svgEl.viewBox.baseVal;
  const r = Math.max(vb.width, vb.height) * 0.012;

  return (
    <g onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {nodes.map((n, idx) => (
        <circle
          key={idx}
          cx={n.x}
          cy={n.y}
          r={r}
          fill="#2563eb"
          stroke="#fff"
          strokeWidth={r * 0.3}
          style={{ cursor: 'grab' }}
          onPointerDown={onPointerDown(n)}
        />
      ))}
    </g>
  );
}
