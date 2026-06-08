'use client';

import type { SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { useI18n } from '@/lib/i18n';

interface InspectorProps {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  zoomViewport: SvgZoomViewport;
  onZoomViewportChange: (viewport: SvgZoomViewport) => void;
  onImageData: (data: ImageData) => void;
  onSvgString: (svg: string) => void;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function Inspector({ activeTool }: InspectorProps) {
  const { t } = useI18n();
  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {t('workspace.inspectorPlaceholder')}
      </p>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t(`tool.${activeTool}`)}</p>
    </aside>
  );
}
