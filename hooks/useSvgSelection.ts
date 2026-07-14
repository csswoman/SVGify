import { useCallback, useRef, useState } from 'react';

export function useSvgSelection() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const selectedPathsRef = useRef<SVGPathElement[]>([]);

  const restore = (pathEl: SVGPathElement) => {
    pathEl.style.stroke = pathEl.getAttribute('stroke') || 'currentColor';
    pathEl.style.strokeWidth = pathEl.getAttribute('stroke-width') || '1';
  };

  const selectPath = useCallback((pathEl: SVGPathElement, id: string) => {
    for (const path of selectedPathsRef.current) restore(path);

    // Highlight new selection
    pathEl.style.stroke = '#ff0000';
    pathEl.style.strokeWidth = '3';

    selectedPathsRef.current = [pathEl];
    setSelectedPathId(id);
  }, []);

  const selectPaths = useCallback((pathEls: SVGPathElement[], id: string) => {
    for (const path of selectedPathsRef.current) restore(path);
    const next = pathEls.filter(Boolean);
    for (const path of next) {
      path.style.stroke = '#ff0000';
      path.style.strokeWidth = '3';
    }
    selectedPathsRef.current = next;
    setSelectedPathId(id);
  }, []);

  const clearSelection = useCallback(() => {
    for (const path of selectedPathsRef.current) restore(path);
    selectedPathsRef.current = [];
    setSelectedPathId(null);
  }, []);

  return {
    selectedPathId,
    selectPath,
    selectPaths,
    clearSelection,
  };
}
