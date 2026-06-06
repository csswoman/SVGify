import { useCallback, useState } from 'react';
import { LabelInfo, addLabelToPath, removeLabelFromPath, extractLabelsFromSvg } from '@/lib/labelUtils';

export function usePathLabels(svgElement: SVGElement | null) {
  const [labels, setLabels] = useState<LabelInfo[]>([]);

  // Extract existing labels from SVG
  const extractLabels = useCallback(() => {
    if (!svgElement) return;
    const extracted = extractLabelsFromSvg(svgElement);
    setLabels(extracted);
  }, [svgElement]);

  // Add label to a path element
  const addLabel = useCallback(
    (pathEl: SVGPathElement, label: string) => {
      addLabelToPath(pathEl, label);
      extractLabels();
    },
    [extractLabels]
  );

  // Remove label from a path element
  const removeLabel = useCallback(
    (pathEl: SVGPathElement) => {
      removeLabelFromPath(pathEl);
      extractLabels();
    },
    [extractLabels]
  );

  // Get label for a specific path
  const getLabelForPath = useCallback(
    (pathEl: SVGPathElement): string | null => {
      return pathEl.getAttribute('data-label');
    },
    []
  );

  // Find path element by label
  const getPathByLabel = useCallback(
    (label: string): SVGPathElement | null => {
      if (!svgElement) return null;
      return svgElement.querySelector(`path[data-label="${label}"]`);
    },
    [svgElement]
  );

  return {
    labels,
    extractLabels,
    addLabel,
    removeLabel,
    getLabelForPath,
    getPathByLabel,
  };
}
