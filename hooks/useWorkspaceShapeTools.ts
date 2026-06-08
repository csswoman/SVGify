'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PathItem } from '@/components/shape/PathList';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';

export function useWorkspaceShapeTools(
  editor: ReturnType<typeof useWorkspaceSvg>,
  _activeTool: WorkspaceTool
) {
  const [selectedPath, setSelectedPath] = useState<SVGPathElement | null>(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [pathItems, setPathItems] = useState<PathItem[]>([]);

  const refreshPathItems = useCallback((svg: SVGSVGElement) => {
    const items: PathItem[] = [];
    svg.querySelectorAll('path').forEach((el, i) => {
      items.push({ el, id: i, fill: el.getAttribute('fill') || '#000000' });
    });
    setPathItems(items);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPath(null);
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
  }, [editor.containerRef]);

  const handleDeleteItem = useCallback(
    (item: PathItem) => {
      item.el.remove();
      const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
      if (svg) refreshPathItems(svg);
      editor.pushSnapshot();
    },
    [editor.containerRef, editor.pushSnapshot, refreshPathItems]
  );

  const removePath = useCallback(
    (path: SVGPathElement) => {
      path.remove();
      const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
      if (svg) refreshPathItems(svg);
      editor.pushSnapshot();
      setSelectedPath(null);
    },
    [editor.containerRef, editor.pushSnapshot, refreshPathItems]
  );

  return {
    selectedPath,
    setSelectedPath,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    pathItems,
    handleHover,
    handleDeleteItem,
    removePath,
  };
}
