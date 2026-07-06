'use client';

import type { RefObject } from 'react';
import type { CanvasDisplaySize } from '@/lib/canvasDisplaySize';
import { useSvgZoom } from '@/hooks/useSvgZoom';

interface ZoomableSvgViewportProps {
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: ReturnType<typeof useSvgZoom>;
  displaySize?: CanvasDisplaySize | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
}

export function ZoomableSvgViewport({
  containerRef,
  zoom,
  displaySize,
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

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
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
          margin: 'auto',
          ...(displaySize
            ? { width: displaySize.width, height: displaySize.height }
            : undefined),
          ...style,
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
}
