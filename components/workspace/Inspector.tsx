'use client';

import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import type { useWorkspaceShapeTools } from '@/hooks/useWorkspaceShapeTools';
import type { useWorkspaceLabels } from '@/hooks/useWorkspaceLabels';
import { VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { ImportInspector } from './inspectors/ImportInspector';
import { VectorizeInspector } from './inspectors/VectorizeInspector';
import { SelectInspector } from './inspectors/SelectInspector';
import { EraseInspector } from './inspectors/EraseInspector';
import { BrushInspector } from './inspectors/BrushInspector';
import { NodesInspector } from './inspectors/NodesInspector';
import { LabelsInspector } from './inspectors/LabelsInspector';
import { FillInspector } from './inspectors/FillInspector';
import { OptimizeInspector } from './inspectors/OptimizeInspector';
import { ZoomInspector } from './inspectors/ZoomInspector';
import { useI18n } from '@/lib/i18n';

interface InspectorProps {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  vectorizeSession: ReturnType<typeof useVectorizeSession>;
  editor: ReturnType<typeof useWorkspaceSvg> | null;
  shapeTools: ReturnType<typeof useWorkspaceShapeTools>;
  labelTools: ReturnType<typeof useWorkspaceLabels>;
  previewBackground: 'checkerboard' | 'black';
  selectedColor: RGBColor | null;
  fillColor: RGBColor;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
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
  shapeTools,
  labelTools,
  previewBackground,
  selectedColor,
  fillColor,
  onSelectedColorChange,
  onFillColorChange,
  onPreviewBackgroundChange,
  onImageData,
  onSvgString,
  onToolChange,
}: InspectorProps) {
  const { t } = useI18n();

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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.eyedropper')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('col.subtitle')}</p>
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
        <FillInspector initialColor={fillColor} onFillColorChange={onFillColorChange} />
      )}

      {activeTool === 'erase' && editor && (
        <EraseInspector
          pathItems={shapeTools.pathItems}
          onHover={shapeTools.handleHover}
          onDelete={shapeTools.handleDeleteItem}
        />
      )}

      {activeTool === 'brush' && (
        <BrushInspector
          brushColor={shapeTools.brushColor}
          brushSize={shapeTools.brushSize}
          onBrushColorChange={shapeTools.setBrushColor}
          onBrushSizeChange={shapeTools.setBrushSize}
        />
      )}

      {activeTool === 'nodes' && (
        <NodesInspector
          hasSelectedPath={!!shapeTools.selectedPath}
          onDeselect={() => shapeTools.setSelectedPath(null)}
        />
      )}

      {activeTool === 'labels' && (
        <LabelsInspector
          labels={labelTools.labels}
          editingPath={labelTools.editingPath}
          selectedLabel={labelTools.selectedLabel}
          onLabelSave={labelTools.handleLabelSave}
          onLabelClick={labelTools.handleLabelClick}
          onCancelEdit={() => {
            labelTools.setEditingPath(null);
            labelTools.clearSelection();
          }}
        />
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
