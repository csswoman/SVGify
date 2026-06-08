'use client';

import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { ShapeEditStep } from '@/components/shape/ShapeEditStep';
import { LabelStep } from '@/components/labels/LabelStep';
import { useI18n } from '@/lib/i18n';

interface LegacyToolBridgeProps {
  activeTool: WorkspaceTool;
  svgString: string;
  zoomViewport: SvgZoomViewport;
  onZoomViewportChange: (viewport: SvgZoomViewport) => void;
  onSvgString: (svg: string) => void;
}

export function LegacyToolBridge({
  activeTool,
  svgString,
  zoomViewport,
  onZoomViewportChange,
  onSvgString,
}: LegacyToolBridgeProps) {
  const { t } = useI18n();

  if (activeTool === 'labels') {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <LabelStep
          svgString={svgString}
          zoomViewport={zoomViewport}
          onZoomViewportChange={onZoomViewportChange}
          onComplete={onSvgString}
        />
      </div>
    );
  }

  if (activeTool === 'erase' || activeTool === 'brush' || activeTool === 'nodes') {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <ShapeEditStep
          svgString={svgString}
          zoomViewport={zoomViewport}
          onZoomViewportChange={onZoomViewportChange}
          onComplete={onSvgString}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
      {t('col.subtitle')}
    </div>
  );
}
