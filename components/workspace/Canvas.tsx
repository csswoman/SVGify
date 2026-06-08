'use client';

import type { SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { useI18n } from '@/lib/i18n';

interface CanvasProps {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  zoomViewport: SvgZoomViewport;
  onZoomViewportChange: (viewport: SvgZoomViewport) => void;
  onImageData: (data: ImageData) => void;
  onSvgString: (svg: string) => void;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function Canvas(_props: CanvasProps) {
  const { t } = useI18n();
  return (
    <main className="flex min-w-0 flex-1 items-center justify-center bg-gray-200/60 dark:bg-gray-950/60">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('workspace.canvasPlaceholder')}</p>
    </main>
  );
}
