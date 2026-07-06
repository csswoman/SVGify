'use client';

import { useCallback, useEffect, type MouseEvent, type RefObject } from 'react';
import {
  getToolCursor,
  resolvePathFromEvent,
  routeBackgroundClick,
  routePathClick,
  type CanvasStatusEvent,
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
  onFillColorChange: (color: RGBColor) => void;
  replacePathColor: (path: SVGPathElement, newColor: RGBColor, previousColor: RGBColor) => void;
  pushSnapshot: () => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  removePath: (path: SVGPathElement) => void;
  erasePathArea: (path: SVGPathElement, clientX: number, clientY: number) => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onEraseHover: (path: SVGPathElement | null) => void;
  onStatusMessage?: (event: CanvasStatusEvent, detail?: string) => void;
}

export function useCanvasToolInteraction({
  activeTool,
  containerRef,
  fillColor,
  selectedColor,
  onSelectedColorChange,
  onFillColorChange,
  replacePathColor,
  pushSnapshot,
  setSelectedPath,
  setEditingLabelPath,
  removePath,
  erasePathArea,
  onToolChange,
  onEraseHover,
  onStatusMessage,
}: UseCanvasToolInteractionOptions) {
  const buildCtx = useCallback((): PathClickContext => ({
    fillColor,
    selectedColor,
    setSelectedColor: onSelectedColorChange,
    setFillColor: onFillColorChange,
    setSelectedPath,
    setEditingLabelPath,
    replacePathColor,
    removePath,
    erasePathArea,
    pushSnapshot,
    onToolChange,
    onStatusMessage,
  }), [fillColor, selectedColor, onSelectedColorChange, onFillColorChange, setSelectedPath, setEditingLabelPath, replacePathColor, removePath, erasePathArea, pushSnapshot, onToolChange, onStatusMessage]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool === 'brush' || activeTool === 'erase' || activeTool === 'optimize') return;

      const path = resolvePathFromEvent(event.target, containerRef.current, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      const ctx = buildCtx();

      if (path) {
        routePathClick(activeTool, path, ctx, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      } else {
        routeBackgroundClick(activeTool, ctx);
      }
    },
    [activeTool, containerRef, buildCtx]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'erasePath') {
        onEraseHover(null);
        return;
      }

      const path = resolvePathFromEvent(event.target, containerRef.current, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
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
