'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface ImageZoom {
  transform: string;
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  reset: () => void;
}

export function useImageZoom(): ImageZoom {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  const setZoom = useCallback((next: number) => {
    const clamped = Math.min(10, Math.max(0.1, next));
    scaleRef.current = clamped;
    setScale(clamped);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(scaleRef.current * factor);
  }, [setZoom]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { active: true, x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    panRef.current = { active: true, x: e.clientX, y: e.clientY };
    const next = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
    offsetRef.current = next;
    setOffset({ ...next });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    panRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const zoomIn = useCallback(() => setZoom(scaleRef.current * 1.1), [setZoom]);
  const zoomOut = useCallback(() => setZoom(scaleRef.current / 1.1), [setZoom]);

  const reset = useCallback(() => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;

  return {
    transform,
    scale,
    zoomIn,
    zoomOut,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    reset,
  };
}
