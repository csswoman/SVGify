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
import { EraseInspector } from './inspectors/EraseInspector';
import { EyedropperInspector } from './inspectors/EyedropperInspector';
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
  open: boolean;
  onClose: () => void;
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
  open,
  onClose,
  onSelectedColorChange,
  onFillColorChange,
  onPreviewBackgroundChange,
  onImageData,
  onSvgString,
  onToolChange,
}: InspectorProps) {
  const { t } = useI18n();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t('workspace.closeInspector')}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label={t('workspace.inspector')}
        className={[
          'fixed inset-y-0 right-0 z-40 w-72 shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 dark:border-gray-700 dark:bg-gray-800',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {(activeTool === 'import' || !imageData) && (
          <ImportInspector
            hasImage={imageData !== null}
            onReplace={() => {
              onImageData(null);
              onToolChange('import');
            }}
          />
        )}

        {activeTool === 'vectorize' && imageData && <VectorizeInspector session={vectorizeSession} />}

        {activeTool === 'eyedropper' && editor && (
          <EyedropperInspector
            svgEl={editor.svgEl}
            selectedColor={selectedColor}
            onSelectedColorChange={onSelectedColorChange}
            onFillColorChange={onFillColorChange}
            onToolChange={onToolChange}
            onPushSnapshot={editor.pushSnapshot}
          />
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
    </>
  );
}
