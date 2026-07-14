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
  const [hasPrepared, setHasPrepared] = useState(false);

  const vectorizeSession = useVectorizeSession({
    imageData,
    enabled: activeTool === 'vectorize',
  });
  const workspaceSvgString = svgString ?? vectorizeSession.svg;

  const handleResetDocument = useCallback(() => {
    setImageData(null);
    setSvgString(null);
    setSelectedColor(null);
    setZoomViewport(DEFAULT_ZOOM_VIEWPORT);
    setActiveTool('import');
  }, []);

  const editor = useWorkspaceSvg({
    svgString: workspaceSvgString,
    zoomViewport,
    onZoomViewportChange: setZoomViewport,
    onSvgChange: setSvgString,
  });

  const shapeTools = useWorkspaceShapeTools(editor);
  const labelTools = useWorkspaceLabels(editor, activeTool);
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

  const handleOptimizePrepared = useCallback(() => {
    setStatusMessage(t('optimize.preparedStatus'));
    setDownloadHighlight(true);
    setHasPrepared(true);
    setNextStepsDismissed(true);
  }, [t]);

  useEffect(() => {
    if (!downloadHighlight) return;
    const id = window.setTimeout(() => setDownloadHighlight(false), 4000);
    return () => window.clearTimeout(id);
  }, [downloadHighlight]);

  useEffect(() => {
    if (activeTool !== 'vectorize') return;
    if (!vectorizeSession.svg) return;
    setSvgString((current) => (current === vectorizeSession.svg ? current : vectorizeSession.svg));
  }, [activeTool, vectorizeSession.svg]);

  useEffect(() => {
    if (!workspaceSvgString) {
      setNextStepsDismissed(false);
      setHasOpenedRefine(false);
      setHasPrepared(false);
    }
  }, [workspaceSvgString]);

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
          svgString={workspaceSvgString}
          labels={labelTools.labels}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={() => editor.undo()}
          onRedo={() => editor.redo()}
          inspectorOpen={inspectorOpen}
          onInspectorToggle={() => setInspectorOpen((open) => !open)}
          showInspectorToggle={imageData !== null}
          downloadHighlight={downloadHighlight}
          downloadPrepared={hasPrepared}
          onDownloadComplete={() => setDownloadHighlight(false)}
        />
        <div className="relative flex min-h-0 flex-1">
          <ToolBar
            activeTool={activeTool}
            document={document}
            onToolChange={handleToolChange}
            showRefineHint={
              !hasOpenedRefine &&
              workspaceSvgString !== null &&
              !guidanceTipActive &&
              !hasPrepared
            }
          />
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
            onImageData={(data) => {
              setUploadError(null);
              setImageData(data);
              setInspectorOpen(true);
            }}
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
            open={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            onSelectedColorChange={setSelectedColor}
            onFillColorChange={setFillColor}
            onResetDocument={handleResetDocument}
            onSvgString={setSvgString}
            onOptimizePrepared={handleOptimizePrepared}
            downloadPrepared={hasPrepared}
          />
        </div>
        <FirstSvgTip
          visible={
            workspaceSvgString !== null &&
            activeTool === 'vectorize' &&
            !vectorizeSession.isLoading &&
            !nextStepsDismissed &&
            !hasOpenedRefine &&
            !hasPrepared
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
          statusMessage={statusMessage}
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
    </ErrorBoundary>
  );
}
