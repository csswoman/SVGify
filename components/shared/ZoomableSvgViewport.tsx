'use client';

import type { RefObject } from 'react';
import { ZoomControls } from '@/components/shared/ZoomControls';
import type { CanvasDisplaySize } from '@/lib/canvasDisplaySize';
import { useSvgZoom } from '@/hooks/useSvgZoom';
import { useI18n } from '@/lib/i18n';

interface ZoomableSvgViewportProps {
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: ReturnType<typeof useSvgZoom>;
  displaySize?: CanvasDisplaySize | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
}

export function ZoomableSvgViewport({
  containerRef,
  zoom,
  displaySize,
  className,
  style,
  onClick,
  'aria-label': ariaLabel,
}: ZoomableSvgViewportProps) {
  const { t } = useI18n();

  return (
    <div className="relative mx-auto w-fit">
      <div
        ref={containerRef}
        onClick={onClick}
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
      <div className="absolute top-2 right-2 z-10">
        <ZoomControls
          scale={zoom.scale}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.reset}
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{t('zoom.panHint')}</p>
    </div>
  );
}
