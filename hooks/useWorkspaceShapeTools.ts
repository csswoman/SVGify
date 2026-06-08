'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PathItem } from '@/components/shape/PathList';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';

export function useWorkspaceShapeTools(
  editor: ReturnType<typeof useWorkspaceSvg>,
  activeTool: WorkspaceTool
) {
  const [selectedPath, setSelectedPath] = useState<SVGPathElement | null>(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [pathItems, setPathItems] = useState<PathItem[]>([]);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  const refreshPathItems = useCallback((svg: SVGSVGElement) => {
    const items: PathItem[] = [];
    svg.querySelectorAll('path').forEach((el, i) => {
      items.push({ el, id: i, fill: el.getAttribute('fill') || '#000000' });
    });
    setPathItems(items);
  }, []);

  useEffect(() => {
    const svg = editor.svgEl as SVGSVGElement | null;
    if (!svg) return;

    refreshPathItems(svg);
    svg.querySelectorAll('[data-svgcraft-editor]').forEach((el) => el.remove());

    const handlers: Array<{ el: SVGPathElement; fn: (e: Event) => void }> = [];
    const shapeTool = activeTool === 'erase' || activeTool === 'nodes' || activeTool === 'brush';

    svg.querySelectorAll('path').forEach((path) => {
      path.style.cursor = shapeTool ? 'pointer' : 'default';
      if (!shapeTool) return;

      const fn = (e: Event) => {
        e.stopPropagation();
        if (activeToolRef.current === 'nodes') {
          setSelectedPath(path);
        } else if (activeToolRef.current === 'erase') {
          path.remove();
          refreshPathItems(svg);
          editor.pushSnapshot();
          setSelectedPath(null);
        }
      };
      path.addEventListener('click', fn);
      handlers.push({ el: path, fn });
    });

    if (activeTool !== 'nodes') {
      setSelectedPath(null);
    }

    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener('click', fn));
    };
  }, [editor.svgEl, activeTool, editor.pushSnapshot, refreshPathItems]);

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
  };
}
