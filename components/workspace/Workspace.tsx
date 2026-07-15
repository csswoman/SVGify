'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport, type RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { countPaths } from '@/lib/simplifyPath';
import { svgByteSize } from '@/lib/optimizeSvg';
import { isShapeTool } from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import { useWorkspaceShapeTools } from '@/hooks/useWorkspaceShapeTools';
import { useWorkspaceLabels } from '@/hooks/useWorkspaceLabels';
import { useWorkspaceExportState } from '@/hooks/useWorkspaceExportState';
import { useWorkspaceShortcuts } from '@/hooks/useWorkspaceShortcuts';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { FirstSvgTip } from './FirstSvgTip';
import { Canvas, type CanvasViewControls } from './Canvas';
import { Inspector } from './Inspector';

export function Workspace() {
  const { t } = useI18n();
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('import');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [zoomViewport, setZoomViewport] = useState<SvgZoomViewport>(DEFAULT_ZOOM_VIEWPORT);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const [fillColor, setFillColor] = useState<RGBColor>({ r: 0, g: 0, b: 0 });
  const [previewBackground, setPreviewBackground] = useState<'checkerboard' | 'black'>('checkerboard');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [canvasViewControls, setCanvasViewControls] = useState<CanvasViewControls | null>(null);
  const [guidanceTipActive, setGuidanceTipActive] = useState(false);
  const [nextStepsDismissed, setNextStepsDismissed] = useState(false);
  const [hasOpenedRefine, setHasOpenedRefine] = useState(false);
  const [downloadHighlight, setDownloadHighlight] = useState(false);

  const vectorizeSession = useVectorizeSession({
    imageData,
    enabled: activeTool === 'vectorize',
  });
  const workspaceSvgString = svgString ?? vectorizeSession.svg;

  const editor = useWorkspaceSvg({
    svgString: workspaceSvgString,
    zoomViewport,
    onZoomViewportChange: setZoomViewport,
    onSvgChange: setSvgString,
  });

  const shapeTools = useWorkspaceShapeTools(editor);
  const labelTools = useWorkspaceLabels(editor, activeTool);
  const exportState = useWorkspaceExportState({
    svgString: workspaceSvgString,
    svgEl: editor.svgEl,
    labels: labelTools.labels,
    staleHint: t('workspace.preparedStaleHint'),
  });
  const document = { imageData, svgString: workspaceSvgString };

  const handleToolChange = useCallback(
    (tool: WorkspaceTool) => {
      if (activeTool === 'vectorize' && tool !== 'vectorize' && vectorizeSession.svg) {
        setSvgString(vectorizeSession.svg);
      }
      if (isShapeTool(tool)) setHasOpenedRefine(true);
      setActiveTool(tool);
      setInspectorOpen(true);
    },
    [activeTool, vectorizeSession.svg]
  );

  const handleOptimizePrepared = useCallback((preparedPayload: string) => {
    setStatusMessage(t('optimize.preparedStatus'));
    setDownloadHighlight(true);
    exportState.markPrepared(preparedPayload);
    setNextStepsDismissed(true);
  }, [exportState, t]);

  const handleResetDocument = useCallback(() => {
    setImageData(null);
    setSvgString(null);
    setSelectedColor(null);
    setZoomViewport(DEFAULT_ZOOM_VIEWPORT);
    setActiveTool('import');
    setNextStepsDismissed(false);
    setHasOpenedRefine(false);
    exportState.resetExportState();
  }, [exportState]);

  const handleImageData = useCallback((data: ImageData) => {
    setUploadError(null);
    setImageData(data);
    setSvgString(null);
    setSelectedColor(null);
    setZoomViewport(DEFAULT_ZOOM_VIEWPORT);
    setStatusMessage(null);
    setNextStepsDismissed(false);
    setHasOpenedRefine(false);
    setDownloadHighlight(false);
    exportState.resetExportState();
    setInspectorOpen(true);
  }, [exportState]);

  useEffect(() => {
    if (!downloadHighlight) return;
    const id = window.setTimeout(() => setDownloadHighlight(false), 4000);
    return () => window.clearTimeout(id);
  }, [downloadHighlight]);

  // Promote live vectorize output into owned workspace SVG while staying on that tool.
  if (
    activeTool === 'vectorize' &&
    vectorizeSession.svg &&
    svgString !== vectorizeSession.svg
  ) {
    setSvgString(vectorizeSession.svg);
  }

  useWorkspaceShortcuts({
    document,
    activeTool,
    onToolChange: handleToolChange,
    onUndo: () => editor.undo(),
    onRedo: () => editor.redo(),
    onZoomIn: canvasViewControls
      ? () => canvasViewControls.zoomIn()
      : workspaceSvgString
        ? () => editor.zoom.zoomIn()
        : undefined,
    onZoomOut: canvasViewControls
      ? () => canvasViewControls.zoomOut()
      : workspaceSvgString
        ? () => editor.zoom.zoomOut()
        : undefined,
    onZoomReset: canvasViewControls
      ? () => canvasViewControls.reset()
      : workspaceSvgString
        ? () => editor.zoom.reset()
        : undefined,
  });

  const isPreTrace = activeTool === 'vectorize' && workspaceSvgString === null;
  const pathCount = workspaceSvgString ? countPaths(workspaceSvgString) : null;
  const byteSize = workspaceSvgString ? svgByteSize(workspaceSvgString) : null;
  const statusZoom = canvasViewControls
    ? {
        scale: canvasViewControls.scale,
        zoomIn: () => canvasViewControls.zoomIn(),
        zoomOut: () => canvasViewControls.zoomOut(),
        reset: () => canvasViewControls.reset(),
      }
    : workspaceSvgString
      ? {
          scale: editor.zoom.scale,
          zoomIn: () => editor.zoom.zoomIn(),
          zoomOut: () => editor.zoom.zoomOut(),
          reset: () => editor.zoom.reset(),
        }
      : null;
  const showPreviewBg = imageData !== null;

  return (
    <ErrorBoundary>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
        <TopBar
          payload={exportState.currentPayload}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={() => editor.undo()}
          onRedo={() => editor.redo()}
          inspectorOpen={inspectorOpen}
          onInspectorToggle={() => setInspectorOpen((open) => !open)}
          showInspectorToggle={imageData !== null}
          downloadHighlight={downloadHighlight}
          downloadPrepared={exportState.exportStatus === 'prepared_current'}
          onDownloadComplete={() => setDownloadHighlight(false)}
        />
        <div className="flex min-h-0 flex-1 flex-col p-3 lg:p-4">
          <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <ToolBar
              activeTool={activeTool}
              document={document}
              onToolChange={handleToolChange}
              showRefineHint={
                !hasOpenedRefine &&
                workspaceSvgString !== null &&
                !guidanceTipActive &&
                exportState.exportStatus !== 'prepared_current'
              }
            />
            <div className="relative flex min-h-0 flex-1 flex-col bg-gray-50/70 dark:bg-gray-900/40">
              <div className="relative flex min-h-0 flex-1">
                <Canvas
                  activeTool={activeTool}
                  imageData={imageData}
                  svgString={workspaceSvgString}
                  vectorizeSession={vectorizeSession}
                  editor={workspaceSvgString ? editor : null}
                  shapeTools={shapeTools}
                  labelTools={labelTools}
                  previewBackground={previewBackground}
                  selectedColor={selectedColor}
                  fillColor={fillColor}
                  uploadError={uploadError}
                  onSelectedColorChange={setSelectedColor}
                  onFillColorChange={setFillColor}
                  onImageData={handleImageData}
                  onUploadError={setUploadError}
                  onToolChange={handleToolChange}
                  onStatusMessage={setStatusMessage}
                  onViewControlsChange={setCanvasViewControls}
                />
                <Inspector
                  activeTool={activeTool}
                  imageData={imageData}
                  svgString={workspaceSvgString}
                  vectorizeSession={vectorizeSession}
                  editor={workspaceSvgString ? editor : null}
                  shapeTools={shapeTools}
                  labelTools={labelTools}
                  selectedColor={selectedColor}
                  fillColor={fillColor}
                  includeLabelLegend={exportState.includeLabelLegend}
                  open={inspectorOpen}
                  onClose={() => setInspectorOpen(false)}
                  onSelectedColorChange={setSelectedColor}
                  onFillColorChange={setFillColor}
                  onIncludeLabelLegendChange={exportState.setIncludeLabelLegend}
                  onResetDocument={handleResetDocument}
                  onSvgString={setSvgString}
                  onOptimizePrepared={handleOptimizePrepared}
                  exportPayload={exportState.currentPayload}
                  exportStatus={exportState.exportStatus}
                />
              </div>
              <FirstSvgTip
                visible={
                  workspaceSvgString !== null &&
                  activeTool === 'vectorize' &&
                  !vectorizeSession.isLoading &&
                  !nextStepsDismissed &&
                  !hasOpenedRefine &&
                  exportState.exportStatus !== 'prepared_current'
                }
                onGoFill={() => {
                  if (vectorizeSession.svg) setSvgString(vectorizeSession.svg);
                  handleToolChange('fill');
                  setNextStepsDismissed(true);
                }}
                onGoOptimize={() => {
                  if (vectorizeSession.svg) setSvgString(vectorizeSession.svg);
                  handleToolChange('optimize');
                  setNextStepsDismissed(true);
                }}
                onDismiss={() => setNextStepsDismissed(true)}
                onActiveChange={setGuidanceTipActive}
              />
              <StatusBar
                pathCount={pathCount}
                byteSize={byteSize}
                activeTool={activeTool}
                statusMessage={exportState.effectiveStatusMessage ?? statusMessage}
                suppressGuidance={guidanceTipActive}
                hasSvg={workspaceSvgString !== null}
                isPreTrace={isPreTrace}
                zoomScale={statusZoom?.scale}
                onZoomIn={statusZoom?.zoomIn}
                onZoomOut={statusZoom?.zoomOut}
                onZoomReset={statusZoom?.reset}
                previewBackground={showPreviewBg ? previewBackground : undefined}
                onPreviewBackgroundChange={showPreviewBg ? setPreviewBackground : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
