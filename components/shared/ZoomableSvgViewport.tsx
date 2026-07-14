'use client';

import { useEffect, type RefObject } from 'react';
import { useSvgZoom } from '@/hooks/useSvgZoom';

interface ZoomableSvgViewportProps {
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: ReturnType<typeof useSvgZoom>;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
}

export function ZoomableSvgViewport({
  containerRef,
  zoom,
  className,
  style,
  onClick,
  onMouseMove,
  'aria-label': ariaLabel,
}: ZoomableSvgViewportProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom.shouldSuppressClick()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', zoom.onWheel, { passive: false });
    return () => el.removeEventListener('wheel', zoom.onWheel);
  }, [containerRef, zoom.onWheel]);

  return (
    <div
      className="relative h-full w-full"
      onPointerDown={zoom.onPointerDown}
      onPointerMove={zoom.onPointerMove}
      onPointerUp={zoom.onPointerUp}
      onPointerCancel={zoom.onPointerUp}
      style={{
        touchAction: 'none',
        cursor: zoom.isPanning ? 'grabbing' : zoom.isPanMode ? 'grab' : undefined,
      }}
    >
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={onMouseMove}
        className={className}
        style={{
          touchAction: 'none',
          width: '100%',
          height: '100%',
          ...style,
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
}
