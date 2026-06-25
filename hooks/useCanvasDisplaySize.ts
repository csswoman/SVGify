'use client';

import { ICON_EDITOR_VIEWPORT, type CanvasDisplaySize } from '@/lib/canvasDisplaySize';

interface UseCanvasDisplaySizeOptions {
  svgEl: SVGElement | null;
}

export function useCanvasDisplaySize({ svgEl }: UseCanvasDisplaySizeOptions) {
  if (!svgEl) return null;

  return {
    width: ICON_EDITOR_VIEWPORT.width,
    height: ICON_EDITOR_VIEWPORT.height,
  } satisfies CanvasDisplaySize;
}
