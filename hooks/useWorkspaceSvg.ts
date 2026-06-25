'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SvgZoomViewport } from '@/types/svg.types';
import { sanitizeSvgString } from '@/lib/sanitize';
import { useSvgZoom } from '@/hooks/useSvgZoom';

interface UseWorkspaceSvgOptions {
  svgString: string | null;
  zoomViewport: SvgZoomViewport;
  onZoomViewportChange: (viewport: SvgZoomViewport) => void;
  onSvgChange?: (svg: string) => void;
}

export function useWorkspaceSvg({
  svgString,
  zoomViewport,
  onZoomViewportChange,
  onSvgChange,
}: UseWorkspaceSvgOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const zoom = useSvgZoom({ viewport: zoomViewport, onViewportChange: onZoomViewportChange });
  const attachZoom = zoom.attach;
  const serializeMountedSvg = zoom.serializeMountedSvg;

  const mountSvg = useCallback(
    (sourceSvg: string): SVGElement | null => {
      const container = containerRef.current;
      if (!container) return null;

      const sanitized = sanitizeSvgString(sourceSvg);
      const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
      if (doc.documentElement.tagName === 'parsererror') return null;

      const svg = doc.documentElement as unknown as SVGElement;
      if (!svg.getAttribute('viewBox')) {
        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        if (w && h) svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      }
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.maxHeight = '100%';
      svg.style.display = 'block';

      container.replaceChildren(svg);
      setSvgEl(svg);
      attachZoom(svg as unknown as SVGSVGElement);
      return svg;
    },
    [attachZoom]
  );

  const pushSnapshot = useCallback(() => {
    const snapshot = serializeMountedSvg();
    if (!snapshot) return;
    if (snapshot === historyRef.current[historyIndexRef.current]) return;
    const nextIndex = historyIndexRef.current + 1;
    setHistory((prev) => {
      const base = prev.slice(0, historyIndexRef.current + 1);
      const next = [...base, snapshot];
      historyRef.current = next;
      return next;
    });
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    onSvgChange?.(snapshot);
  }, [serializeMountedSvg, onSvgChange]);

  useEffect(() => {
    if (!svgString) {
      containerRef.current?.replaceChildren();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- state mirrors the mounted SVG DOM lifecycle
      setSvgEl(null);
      setHistory([]);
      historyRef.current = [];
      setHistoryIndex(-1);
      historyIndexRef.current = -1;
      return;
    }

    const container = containerRef.current;
    const hasLiveSvg = container?.querySelector('svg') != null;

    if (hasLiveSvg) {
      const mounted = serializeMountedSvg();
      if (mounted === svgString) return;
    }

    mountSvg(svgString);
    setHistory([svgString]);
    historyRef.current = [svgString];
    setHistoryIndex(0);
    historyIndexRef.current = 0;
  }, [svgString, mountSvg, serializeMountedSvg]);

  const restore = useCallback(
    (index: number) => {
      const snap = history[index];
      if (snap === undefined) return;
      mountSvg(snap);
      historyIndexRef.current = index;
      setHistoryIndex(index);
      onSvgChange?.(snap);
    },
    [history, mountSvg, onSvgChange]
  );

  const undo = useCallback(() => {
    restore(historyIndexRef.current - 1);
  }, [restore]);

  const redo = useCallback(() => {
    restore(historyIndexRef.current + 1);
  }, [restore]);

  return {
    containerRef,
    svgEl,
    setSvgEl,
    mountSvg,
    pushSnapshot,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    zoom,
    serializeMountedSvg,
  };
}
