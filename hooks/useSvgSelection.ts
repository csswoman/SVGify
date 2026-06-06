import { useCallback, useState } from 'react';

export function useSvgSelection() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedPathEl, setSelectedPathEl] = useState<SVGPathElement | null>(null);

  const selectPath = useCallback((pathEl: SVGPathElement, id: string) => {
    // Clear previous selection
    if (selectedPathEl) {
      selectedPathEl.style.stroke = selectedPathEl.getAttribute('stroke') || 'currentColor';
      selectedPathEl.style.strokeWidth = selectedPathEl.getAttribute('stroke-width') || '1';
    }

    // Highlight new selection
    pathEl.style.stroke = '#ff0000';
    pathEl.style.strokeWidth = '3';

    setSelectedPathEl(pathEl);
    setSelectedPathId(id);
  }, [selectedPathEl]);

  const clearSelection = useCallback(() => {
    if (selectedPathEl) {
      selectedPathEl.style.stroke = selectedPathEl.getAttribute('stroke') || 'currentColor';
      selectedPathEl.style.strokeWidth = selectedPathEl.getAttribute('stroke-width') || '1';
    }
    setSelectedPathEl(null);
    setSelectedPathId(null);
  }, [selectedPathEl]);

  return {
    selectedPathId,
    selectedPathEl,
    selectPath,
    clearSelection,
  };
}
