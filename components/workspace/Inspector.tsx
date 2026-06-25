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
import { useI18n } from '@/lib/i18n';

interface InspectorProps {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  vectorizeSession: ReturnType<typeof useVectorizeSession>;
  editor: ReturnType<typeof useWorkspaceSvg> | null;
  shapeTools: ReturnType<typeof useWorkspaceShapeTools>;
  labelTools: ReturnType<typeof useWorkspaceLabels>;
  selectedColor: RGBColor | null;
  fillColor: RGBColor;
  open: boolean;
  onClose: () => void;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
  onResetDocument: () => void;
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
  selectedColor,
  fillColor,
  open,
  onClose,
  onSelectedColorChange,
  onFillColorChange,
  onResetDocument,
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
            hasSvg={svgString !== null}
            onReplace={onResetDocument}
          />
        )}

        {activeTool === 'vectorize' && imageData && (
          <VectorizeInspector
            session={vectorizeSession}
            onContinueToEdit={() => {
              if (vectorizeSession.svg) onSvgString(vectorizeSession.svg);
              onToolChange('eyedropper');
            }}
          />
        )}

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
          <FillInspector
            initialColor={fillColor}
            svgEl={editor?.svgEl ?? null}
            onFillColorChange={onFillColorChange}
          />
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
            nodeCount={shapeTools.selectedNodeCount}
            onSimplifySelected={shapeTools.simplifySelectedPath}
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

        {activeTool === 'optimize' && svgString && editor && (
          <OptimizeInspector
            svgEl={editor.svgEl}
            svgString={svgString}
            selectedColor={selectedColor}
            onSelectedColorChange={onSelectedColorChange}
            onPushSnapshot={editor.pushSnapshot}
            pathOmit={VECTORIZE_DEFAULTS.pathomit}
            onSvgString={onSvgString}
          />
        )}

      </aside>
    </>
  );
}
