'use client';

import type { RGBColor, SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import { VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { ImportInspector } from './inspectors/ImportInspector';
import { VectorizeInspector } from './inspectors/VectorizeInspector';
import { SelectInspector } from './inspectors/SelectInspector';
import { OptimizeInspector } from './inspectors/OptimizeInspector';
import { ZoomInspector } from './inspectors/ZoomInspector';
import { useI18n } from '@/lib/i18n';

const LEGACY_TOOLS = new Set<WorkspaceTool>(['erase', 'brush', 'nodes', 'labels']);

interface InspectorProps {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  vectorizeSession: ReturnType<typeof useVectorizeSession>;
  editor: ReturnType<typeof useWorkspaceSvg> | null;
  previewBackground: 'checkerboard' | 'black';
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onPreviewBackgroundChange: (bg: 'checkerboard' | 'black') => void;
  onImageData: (data: ImageData | null) => void;
  onSvgString: (svg: string) => void;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function Inspector({
  activeTool,
  imageData,
  svgString,
  vectorizeSession,
  editor,
  previewBackground,
  selectedColor,
  onSelectedColorChange,
  onPreviewBackgroundChange,
  onImageData,
  onSvgString,
  onToolChange,
}: InspectorProps) {
  const { t } = useI18n();

  if (LEGACY_TOOLS.has(activeTool)) {
    return (
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t(`tool.${activeTool}`)}</p>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {(activeTool === 'import' || !imageData) && (
        <ImportInspector
          onReplace={() => {
            onImageData(null);
            onToolChange('import');
          }}
        />
      )}

      {activeTool === 'vectorize' && imageData && <VectorizeInspector session={vectorizeSession} />}

      {activeTool === 'select' && svgString && editor && (
        <SelectInspector
          svgEl={editor.svgEl}
          svgString={svgString}
          selectedColor={selectedColor}
          onSelectedColorChange={onSelectedColorChange}
          onPushSnapshot={editor.pushSnapshot}
        />
      )}

      {activeTool === 'eyedropper' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t('tool.eyedropper')}</h2>
          <p className="text-xs text-gray-500">{t('col.subtitle')}</p>
          {selectedColor && (
            <div
              className="h-10 w-full rounded border border-gray-200 dark:border-gray-700"
              style={{
                backgroundColor: `rgb(${selectedColor.r},${selectedColor.g},${selectedColor.b})`,
              }}
            />
          )}
        </div>
      )}

      {activeTool === 'fill' && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t('tool.fill')}</h2>
          <p className="text-xs text-gray-500">{t('col.subtitle')}</p>
          {selectedColor && (
            <p className="font-mono text-xs text-gray-600 dark:text-gray-300">
              rgb({selectedColor.r},{selectedColor.g},{selectedColor.b})
            </p>
          )}
        </div>
      )}

      {activeTool === 'optimize' && svgString && (
        <OptimizeInspector
          svgString={svgString}
          pathOmit={VECTORIZE_DEFAULTS.pathomit}
          onSvgString={onSvgString}
        />
      )}

      {activeTool === 'zoom' && (
        <ZoomInspector
          previewBackground={previewBackground}
          onPreviewBackgroundChange={onPreviewBackgroundChange}
        />
      )}
    </aside>
  );
}
