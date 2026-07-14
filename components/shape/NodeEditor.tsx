'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { clientPointToElement } from '@/lib/eraseMask';
import {
  parsePathD,
  serializePathD,
  getEditableNodes,
  moveNode,
  type PathSegment,
  type EditableNode,
} from '@/lib/pathEditor';
import { preparePathForNodeEditing } from '@/lib/pathNormalize';

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
  const [, setSegs] = useState<PathSegment[]>(() => {
    const d = preparePathForNodeEditing(pathEl);
    return parsePathD(d);
  });
  const [nodes, setNodes] = useState<EditableNode[]>(() => {
    const d = preparePathForNodeEditing(pathEl);
    return getEditableNodes(parsePathD(d));
  });
  const dragging = useRef<{ node: EditableNode; lastX: number; lastY: number } | null>(null);

  useEffect(() => {
    const editableD = preparePathForNodeEditing(pathEl);
    if (editableD !== (pathEl.getAttribute('d') ?? '')) {
      pathEl.setAttribute('d', editableD);
    }
    const parsed = parsePathD(editableD);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-parse when the selected path changes
    setSegs(parsed);
    setNodes(getEditableNodes(parsed));
  }, [pathEl]);

  const toUser = useCallback(
    (clientX: number, clientY: number) => {
      const pt = clientPointToElement(pathEl, clientX, clientY);
      return { x: pt.x, y: pt.y };
    },
    [pathEl]
  );

  const onPointerDown = (node: EditableNode) => (e: React.PointerEvent) => {
    e.preventDefault();
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
    drag.node = { ...drag.node, x: drag.node.x + dx, y: drag.node.y + dy };
  };

  const onPointerUp = () => {
    if (dragging.current) {
      dragging.current = null;
      onChange();
    }
  };

  const vb = svgEl.viewBox.baseVal;
  const r = Math.max(vb.width, vb.height) * 0.012;

  return (
    <g
      data-svgcraft-editor
      aria-hidden="true"
      onClick={(e) => e.stopPropagation()}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
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
