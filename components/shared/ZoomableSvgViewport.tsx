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
  return (
    <div className="relative mx-auto w-fit">
      <div
        ref={containerRef}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onPointerDown={zoom.onPointerDown}
        onPointerMove={zoom.onPointerMove}
        onPointerUp={zoom.onPointerUp}
        onPointerCancel={zoom.onPointerUp}
        className={className}
        style={{
          touchAction: 'none',
          cursor: zoom.isPanMode ? 'grab' : undefined,
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
