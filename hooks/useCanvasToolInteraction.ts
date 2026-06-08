'use client';

import { useCallback, useEffect, type MouseEvent, type RefObject } from 'react';
import {
  getToolCursor,
  resolvePathFromEvent,
  routeBackgroundClick,
  routePathClick,
  type PathClickContext,
} from '@/lib/canvasToolInteraction';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

interface UseCanvasToolInteractionOptions {
  activeTool: WorkspaceTool;
  containerRef: RefObject<HTMLDivElement | null>;
  fillColor: RGBColor;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  replaceColor: (from: RGBColor, to: RGBColor) => void;
  pushSnapshot: () => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  removePath: (path: SVGPathElement) => void;
  onEraseHover: (path: SVGPathElement | null) => void;
}

export function useCanvasToolInteraction({
  activeTool,
  containerRef,
  fillColor,
  selectedColor,
  onSelectedColorChange,
  replaceColor,
  pushSnapshot,
  setSelectedPath,
  setEditingLabelPath,
  removePath,
  onEraseHover,
}: UseCanvasToolInteractionOptions) {
  const buildCtx = useCallback((): PathClickContext => ({
    fillColor,
    selectedColor,
    setSelectedColor: onSelectedColorChange,
    setSelectedPath,
    setEditingLabelPath,
    replaceColor,
    removePath,
    pushSnapshot,
  }), [fillColor, selectedColor, onSelectedColorChange, setSelectedPath, setEditingLabelPath, replaceColor, removePath, pushSnapshot]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool === 'brush' || activeTool === 'optimize' || activeTool === 'zoom') return;

      const path = resolvePathFromEvent(event.target, containerRef.current);
      const ctx = buildCtx();

      if (path) {
        routePathClick(activeTool, path, ctx);
      } else {
        routeBackgroundClick(activeTool, ctx);
      }
    },
    [activeTool, containerRef, buildCtx]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'erase') {
        onEraseHover(null);
        return;
      }
      const path = resolvePathFromEvent(event.target, containerRef.current);
      onEraseHover(path);
    },
    [activeTool, containerRef, onEraseHover]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      routeBackgroundClick(activeTool, buildCtx());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTool, buildCtx]);

  const cursor = getToolCursor(activeTool);

  return { handleCanvasClick, handleCanvasMouseMove, cursor };
}
