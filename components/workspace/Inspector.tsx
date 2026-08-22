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
  includeLabelLegend: boolean;
  open: boolean;
  onClose: () => void;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
  onIncludeLabelLegendChange: (value: boolean) => void;
  onReplaceImage: (imageData: ImageData) => void;
  onUploadError: (error: string) => void;
  uploadError: string | null;
  onSvgString: (svg: string) => void;
  onOptimizePrepared?: (preparedPayload: string) => void;
  exportPayload: string | null;
  exportStatus: 'no_document' | 'not_prepared' | 'prepared_current' | 'prepared_stale';
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
  includeLabelLegend,
  open,
  onClose,
  onSelectedColorChange,
  onFillColorChange,
  onIncludeLabelLegendChange,
  onReplaceImage,
  onUploadError,
  uploadError,
  onSvgString,
  onOptimizePrepared,
  exportPayload,
  exportStatus,
}: InspectorProps) {
  const { t } = useI18n();

  // Empty workspace: canvas owns onboarding — hide the inspector column entirely.
  if (!imageData) return null;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t('workspace.closeInspector')}
          className="fixed inset-0 z-30 bg-black/30 inspector:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label={t('workspace.inspector')}
        className={[
          // Below the inspector breakpoint: bottom sheet anchored to the viewport
          // floor, capped well under full height so the TopBar (and its own
          // close-inspector toggle) always stays visible and reachable above it.
          // At/above the breakpoint: static sidebar, full column height.
          'fixed inset-x-0 bottom-0 z-40 flex max-h-[min(70dvh,32rem)] w-full shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface px-4 pb-4 pt-2 transition-transform duration-200 ease-out inspector:static inspector:inset-auto inspector:z-auto inspector:h-full inspector:max-h-none inspector:w-80 inspector:translate-y-0 inspector:rounded-none inspector:border-t-0 inspector:border-l inspector:pt-4 dark:border-dark-border dark:bg-dark-surface',
          open
            ? 'translate-y-0'
            : 'pointer-events-none translate-y-full inspector:pointer-events-auto inspector:translate-y-0',
        ].join(' ')}
      >
        <div
          aria-hidden
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-border-strong inspector:hidden dark:bg-dark-border-strong"
        />
        {(activeTool === 'erase' || activeTool === 'erasePath') && editor ? (
          <EraseInspector
            mode={activeTool === 'erase' ? 'brush' : 'path'}
            pathItems={shapeTools.pathItems}
            eraseSize={shapeTools.brushSize}
            onHover={shapeTools.handleHover}
            onDelete={shapeTools.handleDeleteItem}
            onEraseSizeChange={shapeTools.setBrushSize}
          />
        ) : (
          <div className="scroll-quiet min-h-0 flex-1">
            {activeTool === 'import' && (
              <ImportInspector
                onReplace={onReplaceImage}
                onError={onUploadError}
                uploadError={uploadError}
              />
            )}

            {activeTool === 'vectorize' && (
              <VectorizeInspector session={vectorizeSession} />
            )}

            {(activeTool === 'fill' || activeTool === 'eyedropper') && (
              <FillInspector
                initialColor={fillColor}
                svgEl={editor?.svgEl ?? null}
                isSampling={activeTool === 'eyedropper'}
                sampledColor={selectedColor}
                onFillColorChange={onFillColorChange}
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
                includeLabelLegend={includeLabelLegend}
                onLabelSave={labelTools.handleLabelSave}
                onLabelClick={labelTools.handleLabelClick}
                onCancelEdit={() => {
                  labelTools.setEditingPath(null);
                  labelTools.clearSelection();
                }}
                onIncludeLabelLegendChange={onIncludeLabelLegendChange}
              />
            )}

            {activeTool === 'optimize' && svgString && editor && (
              <OptimizeInspector
                svgEl={editor.svgEl}
                svgString={svgString}
                selectedColor={selectedColor}
                onSelectedColorChange={onSelectedColorChange}
                serializeMountedSvg={editor.serializeMountedSvg}
                pathOmit={VECTORIZE_DEFAULTS.filterSpeckle}
                onSvgString={onSvgString}
                onPrepared={onOptimizePrepared}
                prepared={exportStatus === 'prepared_current'}
                stale={exportStatus === 'prepared_stale'}
                exportPayload={exportPayload}
                includeLabelLegend={includeLabelLegend}
                labels={labelTools.labels}
              />
            )}
          </div>
        )}
      </aside>
    </>
  );
}
