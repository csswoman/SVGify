import { useCallback, useRef, useState } from 'react';

export function useSvgSelection() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  // The selected DOM node is held in a ref: it is imperatively managed and
  // mutated (stroke styles), which is not allowed for useState values.
  const selectedPathRef = useRef<SVGPathElement | null>(null);

  const restore = (pathEl: SVGPathElement) => {
    pathEl.style.stroke = pathEl.getAttribute('stroke') || 'currentColor';
    pathEl.style.strokeWidth = pathEl.getAttribute('stroke-width') || '1';
  };

  const selectPath = useCallback((pathEl: SVGPathElement, id: string) => {
    if (selectedPathRef.current) restore(selectedPathRef.current);

    // Highlight new selection
    pathEl.style.stroke = '#ff0000';
    pathEl.style.strokeWidth = '3';

    selectedPathRef.current = pathEl;
    setSelectedPathId(id);
  }, []);

  const clearSelection = useCallback(() => {
    if (selectedPathRef.current) restore(selectedPathRef.current);
    selectedPathRef.current = null;
    setSelectedPathId(null);
  }, []);

  return {
    selectedPathId,
    selectPath,
    clearSelection,
  };
}
