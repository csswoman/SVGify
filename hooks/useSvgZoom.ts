import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DEFAULT_ZOOM_SCALE,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  type SvgZoomViewport,
} from '@/types/svg.types';
import {
  centeredZoomOffset,
  clampZoomOffset,
  readSvgViewBox,
  serializeSvgAtBaseViewBox,
  zoomOffsetPreservingCenter,
  zoomViewBoxSize,
  type SvgBaseViewBox,
} from '@/lib/svgViewBox';

export interface ZoomState {
  scale: number;
}

interface UseSvgZoomOptions {
  viewport?: SvgZoomViewport;
  onViewportChange?: (viewport: SvgZoomViewport) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

const DEFAULT_VIEWPORT: SvgZoomViewport = {
  scale: DEFAULT_ZOOM_SCALE,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Zoom + pan controls for a mounted <svg>, driven by its viewBox.
 * Keeps the original viewBox as the "fit" baseline and scales/translates from it.
 */
export function useSvgZoom(options: UseSvgZoomOptions = {}) {
  const initialViewport = options.viewport ?? DEFAULT_VIEWPORT;
  const baseRef = useRef<SvgBaseViewBox | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef(initialViewport);
  const onViewportChangeRef = useRef(options.onViewportChange);
  const spaceDownRef = useRef(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const suppressNextClickRef = useRef(false);

  const [scale, setScale] = useState(initialViewport.scale);
  const scaleRef = useRef(initialViewport.scale);
  const offset = useRef({ x: initialViewport.offsetX, y: initialViewport.offsetY });

  useEffect(() => {
    viewportRef.current = options.viewport ?? DEFAULT_VIEWPORT;
    onViewportChangeRef.current = options.onViewportChange;
  }, [options.viewport, options.onViewportChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof HTMLElement && event.target.isContentEditable) return;
      event.preventDefault();
      spaceDownRef.current = true;
      setSpaceDown(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      spaceDownRef.current = false;
      setSpaceDown(false);
    };
    const clearSpaceMode = () => {
      spaceDownRef.current = false;
      panRef.current.active = false;
      setSpaceDown(false);
      setIsPanning(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearSpaceMode);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearSpaceMode);
    };
  }, []);

  const emitViewport = useCallback((nextScale: number, ox: number, oy: number) => {
    onViewportChangeRef.current?.({ scale: nextScale, offsetX: ox, offsetY: oy });
  }, []);

  const apply = useCallback((newScale: number, ox: number, oy: number) => {
    const svg = svgRef.current;
    const base = baseRef.current;
    if (!svg || !base) return;
    const { w, h } = zoomViewBoxSize(base, newScale);
    svg.setAttribute('viewBox', `${base.x + ox} ${base.y + oy} ${w} ${h}`);
  }, []);

  const attach = useCallback(
    (svg: SVGSVGElement | null) => {
      svgRef.current = svg;
      if (!svg) return;

      const base = readSvgViewBox(svg);
      baseRef.current = base;

      const viewport = viewportRef.current;
      const nextScale = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, viewport.scale));
      const isDefaultOffset = viewport.offsetX === 0 && viewport.offsetY === 0;
      offset.current =
        isDefaultOffset && nextScale <= 1
          ? centeredZoomOffset(base, nextScale)
          : clampZoomOffset(base, nextScale, viewport.offsetX, viewport.offsetY);
      scaleRef.current = nextScale;
      setScale(nextScale);
      svg.setAttribute('viewBox', `${base.x} ${base.y} ${base.w} ${base.h}`);
      apply(nextScale, offset.current.x, offset.current.y);
      if (isDefaultOffset && nextScale <= 1) {
        emitViewport(nextScale, offset.current.x, offset.current.y);
      }
    },
    [apply, emitViewport]
  );

  const setZoom = useCallback(
    (next: number, options?: { recenter?: boolean }) => {
      const clamped = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, next));
      const base = baseRef.current;
      const previousScale = scaleRef.current;
      if (base) {
        offset.current = options?.recenter
          ? centeredZoomOffset(base, clamped)
          : zoomOffsetPreservingCenter(base, previousScale, clamped, offset.current);
      }
      scaleRef.current = clamped;
      setScale(clamped);
      apply(clamped, offset.current.x, offset.current.y);
      emitViewport(clamped, offset.current.x, offset.current.y);
    },
    [apply, emitViewport]
  );

  const zoomIn = useCallback(() => setZoom(scaleRef.current * 1.3), [setZoom]);
  const zoomOut = useCallback(() => setZoom(scaleRef.current / 1.3), [setZoom]);
  const reset = useCallback(() => {
    setZoom(DEFAULT_ZOOM_SCALE, { recenter: true });
  }, [setZoom]);

  const pan = useCallback(
    (dxUser: number, dyUser: number) => {
      const base = baseRef.current;
      if (!base) return;
      const currentScale = scaleRef.current;
      const next = clampZoomOffset(
        base,
        currentScale,
        offset.current.x - dxUser,
        offset.current.y - dyUser
      );
      offset.current = next;
      apply(currentScale, offset.current.x, offset.current.y);
      emitViewport(currentScale, offset.current.x, offset.current.y);
    },
    [apply, emitViewport]
  );

  const panByClientDelta = useCallback(
    (dxPx: number, dyPx: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const vb = svg.viewBox.baseVal;
      pan((dxPx / rect.width) * vb.width, (dyPx / rect.height) * vb.height);
    },
    [pan]
  );

  const shouldStartPan = useCallback(
    (event: ReactPointerEvent) => event.button === 1 || event.altKey || spaceDownRef.current,
    []
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!shouldStartPan(event)) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { active: true, x: event.clientX, y: event.clientY };
      setIsPanning(true);
    },
    [shouldStartPan]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!panRef.current.active) return;
      const dx = event.clientX - panRef.current.x;
      const dy = event.clientY - panRef.current.y;
      if (dx !== 0 || dy !== 0) {
        suppressNextClickRef.current = true;
      }
      panRef.current = { active: true, x: event.clientX, y: event.clientY };
      panByClientDelta(dx, dy);
    },
    [panByClientDelta]
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current.active) return;
    panRef.current.active = false;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const shouldSuppressClick = useCallback(() => {
    if (spaceDownRef.current || panRef.current.active) return true;
    if (!suppressNextClickRef.current) return false;
    suppressNextClickRef.current = false;
    return true;
  }, []);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(scaleRef.current * factor);
    },
    [setZoom]
  );

  const serializeMountedSvg = useCallback((): string | null => {
    const svg = svgRef.current;
    const base = baseRef.current;
    if (!svg || !base) return null;
    return serializeSvgAtBaseViewBox(svg, base);
  }, []);

  const getBaseViewBox = useCallback(() => baseRef.current, []);

  useEffect(() => {
    const el = options.containerRef?.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [options.containerRef, onWheel]);

  return {
    attach,
    scale,
    zoomIn,
    zoomOut,
    reset,
    setZoom,
    pan,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    shouldSuppressClick,
    serializeMountedSvg,
    getBaseViewBox,
    isPanMode: spaceDown || isPanning,
    isPanning,
  };
}
