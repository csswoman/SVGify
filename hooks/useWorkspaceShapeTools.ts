'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PathItem } from '@/components/shape/PathList';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import { simplifyPathD } from '@/lib/simplifyPath';

const AUTO_NODE_TARGET = 90;
const AUTO_SIMPLIFY_EPSILONS = [0.35, 0.55, 0.8, 1.1];

function pathStats(path: SVGPathElement): { area: number; nodeCount: number } {
  const d = path.getAttribute('d') ?? '';
  const nodeCount = countPathNodes(d);
  const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const area = numbers.length >= 4 ? Math.max(0, maxX - minX) * Math.max(0, maxY - minY) : 0;
  return { area, nodeCount };
}

function countPathNodes(d: string): number {
  return (d.match(/[MLCQ]/g) ?? []).length;
}

export function useWorkspaceShapeTools(editor: ReturnType<typeof useWorkspaceSvg>) {
  const [selectedPath, setSelectedPathState] = useState<SVGPathElement | null>(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [pathItems, setPathItems] = useState<PathItem[]>([]);

  const refreshPathItems = useCallback((svg: SVGSVGElement) => {
    const items: PathItem[] = [];
    svg.querySelectorAll('path').forEach((el, i) => {
      items.push({
        el,
        id: i,
        fill: el.getAttribute('fill') || '#000000',
        ...pathStats(el),
      });
    });
    setPathItems(items.sort((a, b) => a.area - b.area));
  }, []);

  useEffect(() => {
    if (editor.svgEl instanceof SVGSVGElement) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- path list mirrors the mounted SVG DOM
      refreshPathItems(editor.svgEl);
    }
  }, [editor.svgEl, refreshPathItems]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPathState(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleHover = useCallback((el: SVGPathElement | null) => {
    const svg = editor.containerRef.current?.querySelector('svg');
    svg?.querySelectorAll('path[data-hl]').forEach((p) => {
      (p as SVGPathElement).style.opacity = '';
      p.removeAttribute('data-hl');
    });
    if (el) {
      el.style.opacity = '0.4';
      el.setAttribute('data-hl', '1');
    }
  }, [editor]);

  const handleDeleteItem = useCallback(
    (item: PathItem) => {
      item.el.remove();
      const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
      if (svg) refreshPathItems(svg);
      editor.pushSnapshot();
    },
    [editor, refreshPathItems]
  );

  const removePath = useCallback(
    (path: SVGPathElement) => {
      path.remove();
      const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
      if (svg) refreshPathItems(svg);
      editor.pushSnapshot();
      setSelectedPathState(null);
    },
    [editor, refreshPathItems]
  );

  const simplifyPathToNodeTarget = useCallback(
    (path: SVGPathElement, targetNodes = AUTO_NODE_TARGET): boolean => {
      const originalD = path.getAttribute('d') ?? '';
      if (countPathNodes(originalD) <= targetNodes) return false;

      let bestD = originalD;
      let bestCount = countPathNodes(originalD);

      for (const epsilon of AUTO_SIMPLIFY_EPSILONS) {
        const candidateD = simplifyPathD(originalD, epsilon, 1);
        const candidateCount = countPathNodes(candidateD);
        if (candidateCount < bestCount) {
          bestD = candidateD;
          bestCount = candidateCount;
        }
        if (candidateCount <= targetNodes) break;
      }

      if (bestD === originalD) return false;
      path.setAttribute('d', bestD);
      return true;
    },
    []
  );

  const setSelectedPath = useCallback(
    (path: SVGPathElement | null) => {
      if (!path) {
        setSelectedPathState(null);
        return;
      }

      const changed = simplifyPathToNodeTarget(path);
      setSelectedPathState(path);
      if (changed) {
        const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
        if (svg) refreshPathItems(svg);
        editor.pushSnapshot();
      }
    },
    [editor, refreshPathItems, simplifyPathToNodeTarget]
  );

  const simplifySelectedPath = useCallback(
    (epsilon = 0.45) => {
      if (!selectedPath) return;
      const d = selectedPath.getAttribute('d') ?? '';
      selectedPath.setAttribute('d', simplifyPathD(d, epsilon, 1));
      const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
      if (svg) refreshPathItems(svg);
      editor.pushSnapshot();
    },
    [editor, refreshPathItems, selectedPath]
  );

  const selectedNodeCount = selectedPath ? pathStats(selectedPath).nodeCount : 0;

  return {
    selectedPath,
    setSelectedPath,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    pathItems,
    selectedNodeCount,
    handleHover,
    handleDeleteItem,
    removePath,
    simplifySelectedPath,
  };
}
