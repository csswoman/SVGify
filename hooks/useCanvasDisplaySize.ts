'use client';

import { useEffect, useState, type RefObject } from 'react';
import {
  computeCanvasDisplaySize,
  type CanvasDisplaySize,
} from '@/lib/canvasDisplaySize';
import { readSvgViewBox } from '@/lib/svgViewBox';

/** Matches Canvas section padding (p-4 = 16px per side). */
export const CANVAS_PANEL_PADDING_PX = 16;

/** Tailwind 32rem at default root font size. */
export const MAX_CANVAS_HEIGHT_PX = 512;

interface UseCanvasDisplaySizeOptions {
  svgEl: SVGElement | null;
  panelRef: RefObject<HTMLElement | null>;
}

export function useCanvasDisplaySize({ svgEl, panelRef }: UseCanvasDisplaySizeOptions) {
  const [displaySize, setDisplaySize] = useState<CanvasDisplaySize | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !svgEl) {
      setDisplaySize(null);
      return;
    }

    const recompute = () => {
      const panelWidth = panel.clientWidth - CANVAS_PANEL_PADDING_PX * 2;
      const maxHeight = Math.min(
        Math.round(window.innerHeight * 0.7),
        MAX_CANVAS_HEIGHT_PX
      );
      const viewBox = readSvgViewBox(svgEl as SVGSVGElement);
      setDisplaySize(
        computeCanvasDisplaySize(
          { w: viewBox.w, h: viewBox.h },
          { maxWidth: Math.max(1, panelWidth), maxHeight: Math.max(1, maxHeight) }
        )
      );
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(panel);
    window.addEventListener('resize', recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [svgEl, panelRef]);

  return displaySize;
}
