'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageDropzone } from '@/components/upload/ImageDropzone';
import { ImagePreview } from '@/components/vectorize/ImagePreview';
import { SvgPreview } from '@/components/vectorize/SvgPreview';
import { NodeEditor } from '@/components/shape/NodeEditor';
import { BrushEditor } from '@/components/shape/BrushEditor';
import { EraseEditor } from '@/components/shape/EraseEditor';
import { ZoomableSvgViewport } from '@/components/shared/ZoomableSvgViewport';
import { formatBytes, svgByteSize } from '@/lib/optimizeSvg';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useCanvasToolInteraction } from '@/hooks/useCanvasToolInteraction';
import type { CanvasStatusEvent } from '@/lib/canvasToolInteraction';
import { useSvgZoom } from '@/hooks/useSvgZoom';
import { useImageZoom } from '@/hooks/useImageZoom';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
import type { useWorkspaceShapeTools } from '@/hooks/useWorkspaceShapeTools';
import type { useWorkspaceLabels } from '@/hooks/useWorkspaceLabels';
import { useI18n } from '@/lib/i18n';
import { CanvasOverlay } from '@/components/shared/CanvasOverlay';
import { createSampleIconImageData } from '@/lib/sampleImage';

const CHECKERBOARD_BG: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '16px 16px',
};

const BLACK_BG: React.CSSProperties = {
  backgroundColor: '#000000',
};

export interface CanvasViewControls {
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface CanvasProps {
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
  uploadError: string | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
  onImageData: (data: ImageData) => void;
  onUploadError: (error: string) => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onStatusMessage: (message: string) => void;
  /** Zoom for vectorize / image preview; null when the editor owns zoom. */
  onViewControlsChange?: (controls: CanvasViewControls | null) => void;
}

export function Canvas({
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
  uploadError,
  onSelectedColorChange,
  onFillColorChange,
  onImageData,
  onUploadError,
  onToolChange,
  onStatusMessage,
  onViewControlsChange,
}: CanvasProps) {
  const { t } = useI18n();
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const isVectorizeView = activeTool === 'vectorize';
  const canEdit = svgString !== null && editor !== null;
  const tracedSvg = svgString ?? vectorizeSession.svg;
  const isPreTrace = isVectorizeView && !svgString;
  const showEditorSurface = canEdit && !isVectorizeView;
  const { replacePathColor } = useSvgColors(editor?.svgEl ?? null);
  const vectorizeContainerRef = useRef<HTMLDivElement>(null);
  const vectorizeZoom = useSvgZoom({ containerRef: vectorizeContainerRef });
  const imageZoom = useImageZoom();
  const previewStyle = previewBackground === 'black' ? BLACK_BG : CHECKERBOARD_BG;

  const handleVectorizeSvgMount = useCallback(
    (svg: SVGSVGElement | null) => {
      if (svg) vectorizeZoom.attach(svg);
    },
    [vectorizeZoom.attach]
  );

  useEffect(() => {
    if (!onViewControlsChange) return;

    if (!imageData || showEditorSurface) {
      onViewControlsChange(null);
      return;
    }

    const useVectorizeZoom =
      isVectorizeView && Boolean(tracedSvg) && !showOriginalPreview && !isPreTrace;
    const active = useVectorizeZoom ? vectorizeZoom : imageZoom;

    onViewControlsChange({
      scale: active.scale,
      zoomIn: active.zoomIn,
      zoomOut: active.zoomOut,
      reset: active.reset,
    });
  }, [
    imageData,
    showEditorSurface,
    isVectorizeView,
    tracedSvg,
    showOriginalPreview,
    isPreTrace,
    vectorizeZoom.scale,
    vectorizeZoom.zoomIn,
    vectorizeZoom.zoomOut,
    vectorizeZoom.reset,
    imageZoom.scale,
    imageZoom.zoomIn,
    imageZoom.zoomOut,
    imageZoom.reset,
    onViewControlsChange,
  ]);

  useEffect(() => {
    if (!isVectorizeView || !tracedSvg || showOriginalPreview) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.target instanceof HTMLElement && event.target.isContentEditable) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
        event.preventDefault();
        vectorizeZoom.zoomIn();
      } else if (event.key === '-' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        vectorizeZoom.zoomOut();
      } else if (event.key === '0' || event.code === 'Numpad0') {
        event.preventDefault();
        vectorizeZoom.reset();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVectorizeView, showOriginalPreview, tracedSvg, vectorizeZoom]);
  const handleCanvasStatusMessage = useCallback(
    (event: CanvasStatusEvent, detail?: string) => {
      if (event === 'colorPicked' && detail) {
        onStatusMessage(`${t('workspace.statusColorPicked')} ${detail}`);
      } else if (event === 'fillPainted') {
        onStatusMessage(t('workspace.statusFillPainted'));
      }
    },
    [onStatusMessage, t]
  );
  const { handleCanvasClick, handleCanvasMouseMove, cursor } = useCanvasToolInteraction({
    activeTool,
    containerRef: editor?.containerRef ?? { current: null },
    fillColor,
    selectedColor,
    onSelectedColorChange,
    onFillColorChange,
    replacePathColor,
    pushSnapshot: editor?.pushSnapshot ?? (() => {}),
    setSelectedPath: shapeTools.setSelectedPath,
    setEditingLabelPath: labelTools.setEditingPath,
    removePath: shapeTools.removePath,
    erasePathArea: shapeTools.erasePathArea,
    onToolChange,
    onEraseHover: shapeTools.handleHover,
    onStatusMessage: handleCanvasStatusMessage,
  });

  const handleUpload = useCallback(
    (data: ImageData) => {
      onImageData(data);
      onToolChange('vectorize');
    },
    [onImageData, onToolChange]
  );

  const handleSample = useCallback(() => {
    try {
      handleUpload(createSampleIconImageData());
    } catch {
      onUploadError(t('upload.error.UNKNOWN'));
    }
  }, [handleUpload, onUploadError, t]);

  if (!imageData) {
    return (
      <section
        aria-label={t('workspace.canvas')}
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5 bg-gray-200/60 p-4 sm:p-8 dark:bg-gray-950/60"
      >
        {uploadError && (
          <div
            role="alert"
            className="w-full max-w-lg rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          >
            {uploadError}
          </div>
        )}
        <div className="w-full max-w-lg space-y-4">
          <div className="space-y-1 text-center">
            <h2 className="text-balance text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('onboard.emptyTitle')}
            </h2>
            <p className="text-pretty text-sm text-gray-600 dark:text-gray-300">
              {t('onboard.emptyBody')}
            </p>
          </div>
          <ImageDropzone onImageData={handleUpload} onError={onUploadError} />
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleSample}
              className="btn-tertiary w-full"
            >
              {t('onboard.trySample')}
            </button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              {t('upload.privacy')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!isVectorizeView && !canEdit) {
    return (
      <section
        aria-label={t('workspace.canvas')}
        className="flex min-w-0 flex-1 flex-col bg-gray-200/60 dark:bg-gray-950/60"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t('tool.vectorize')}
            </p>
          </div>
          <div
            className="relative min-h-0 flex-1 overflow-hidden border border-gray-200 dark:border-gray-700"
            style={previewStyle}
          >
            <ImagePreview
              imageData={imageData}
              label={t('vec.original')}
              zoomTransform={imageZoom.transform}
              onPointerDown={imageZoom.onPointerDown}
              onPointerMove={imageZoom.onPointerMove}
              onPointerUp={imageZoom.onPointerUp}
              onWheel={imageZoom.onWheel}
            />
          </div>
        </div>
      </section>
    );
  }

  const { processedImageData, svg, removeBg, handlePick, seeds, error, isLoading } = vectorizeSession;
  const { containerRef, zoom, pushSnapshot, svgEl } = editor ?? {
    containerRef: { current: null },
    zoom: null,
    pushSnapshot: () => {},
    svgEl: null,
  };
  const { selectedPath, brushColor, brushSize } = shapeTools;
  const svgForPortals = svgEl as SVGSVGElement | null;
  const compareOriginalImage = processedImageData ?? imageData;

  return (
    <section
      ref={canvasPanelRef}
      aria-label={t('workspace.canvas')}
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-200/60 p-3 dark:bg-gray-950/60"
    >
      {isVectorizeView && (
        <>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}
          {processedImageData && (
            <div className="flex flex-col h-full gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('vec.vector')}
                  {tracedSvg && !isPreTrace && (
                    <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                      ({formatBytes(svgByteSize(tracedSvg))})
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowOriginalPreview((v) => !v)}
                  className="focus-ring min-h-8 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-expanded={showOriginalPreview}
                >
                  {showOriginalPreview ? t('vec.hideOriginal') : t('workflow.compareOriginal')}
                </button>
              </div>

              <div
                className="relative flex-1 overflow-hidden border border-gray-200 dark:border-gray-700"
                style={previewStyle}
              >
                <CanvasOverlay isVisible={isLoading} label={t('vec.vectorizing')} />
                {isPreTrace && (
                  <div className="absolute left-3 top-3 rounded-md border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {t('vec.notTracedYet')}
                  </div>
                )}
                <div
                  ref={vectorizeContainerRef}
                  className="w-full h-full"
                  style={{ visibility: showOriginalPreview ? 'hidden' : 'visible' }}
                  onPointerDown={vectorizeZoom.onPointerDown}
                  onPointerMove={vectorizeZoom.onPointerMove}
                  onPointerUp={vectorizeZoom.onPointerUp}
                  onPointerCancel={vectorizeZoom.onPointerUp}
                >
                  <SvgPreview
                    svgString={svg}
                    onSvgMount={handleVectorizeSvgMount}
                    transparentBackground={previewBackground === 'checkerboard'}
                  />
                </div>

                {showOriginalPreview && (
                  <ImagePreview
                    imageData={processedImageData}
                    label={removeBg ? t('vec.originalPick') : t('vec.original')}
                    onPick={removeBg ? handlePick : undefined}
                    seeds={removeBg ? seeds : undefined}
                    zoomTransform={imageZoom.transform}
                    onPointerDown={imageZoom.onPointerDown}
                    onPointerMove={imageZoom.onPointerMove}
                    onPointerUp={imageZoom.onPointerUp}
                    onWheel={imageZoom.onWheel}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {canEdit && zoom && (
        <div
          className={isVectorizeView ? 'hidden' : 'flex h-full min-w-0 flex-1 flex-col'}
          aria-hidden={isVectorizeView}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t(`tool.${activeTool}`)}
              </p>
              {compareOriginalImage && (
                <button
                  type="button"
                  onClick={() => setShowOriginalPreview((v) => !v)}
                  className="focus-ring min-h-8 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  aria-expanded={showOriginalPreview}
                >
                  {showOriginalPreview ? t('vec.hideOriginal') : t('workflow.compareOriginal')}
                </button>
              )}
            </div>
            <div
              className="relative min-h-0 flex-1 overflow-hidden border border-gray-200 dark:border-gray-700"
              style={{
                ...previewStyle,
                cursor: showEditorSurface && !showOriginalPreview ? cursor : undefined,
              }}
            >
              <CanvasOverlay isVisible={editor?.isBusy ?? false} label={t('workspace.working')} />
              <div
                className="h-full w-full"
                style={{ visibility: showOriginalPreview ? 'hidden' : 'visible' }}
              >
                <ZoomableSvgViewport
                  containerRef={containerRef}
                  zoom={zoom}
                  onClick={showEditorSurface ? handleCanvasClick : undefined}
                  onMouseMove={showEditorSurface ? handleCanvasMouseMove : undefined}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    cursor: zoom.isPanning
                      ? 'grabbing'
                      : zoom.isPanMode
                        ? 'grab'
                        : showEditorSurface
                          ? cursor
                          : undefined,
                  }}
                  aria-label={t('workspace.canvas')}
                />
              </div>
              {showOriginalPreview && compareOriginalImage && (
                <ImagePreview
                  imageData={compareOriginalImage}
                  label={t('vec.original')}
                  zoomTransform="scale(1)"
                />
              )}
            </div>
          </div>
          {showEditorSurface &&
            svgForPortals &&
            activeTool === 'nodes' &&
            selectedPath &&
            createPortal(
              <NodeEditor pathEl={selectedPath} svgEl={svgForPortals} onChange={pushSnapshot} />,
              selectedPath.parentElement ?? svgForPortals
            )}
          {showEditorSurface &&
            svgForPortals &&
            activeTool === 'erase' &&
            createPortal(
              <EraseEditor
                svgEl={svgForPortals}
                size={brushSize}
                onChange={pushSnapshot}
              />,
              svgForPortals
            )}
          {showEditorSurface &&
            svgForPortals &&
            activeTool === 'brush' &&
            createPortal(
              <BrushEditor
                svgEl={svgForPortals}
                color={brushColor}
                size={brushSize}
                onChange={pushSnapshot}
              />,
              svgForPortals
            )}
        </div>
      )}
    </section>
  );
}
