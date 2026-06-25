'use client';

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageDropzone } from '@/components/upload/ImageDropzone';
import { ImagePreview } from '@/components/vectorize/ImagePreview';
import { SvgPreview } from '@/components/vectorize/SvgPreview';
import { PalettePreview } from '@/components/vectorize/PalettePreview';
import { NodeEditor } from '@/components/shape/NodeEditor';
import { BrushEditor } from '@/components/shape/BrushEditor';
import { ZoomableSvgViewport } from '@/components/shared/ZoomableSvgViewport';
import { formatBytes, svgByteSize } from '@/lib/optimizeSvg';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useCanvasDisplaySize } from '@/hooks/useCanvasDisplaySize';
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

const CHECKERBOARD_BG: React.CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '16px 16px',
};

const BLACK_BG: React.CSSProperties = {
  backgroundColor: '#000000',
};

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
  onImageData: (data: ImageData) => void;
  onUploadError: (error: string) => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onStatusMessage: (message: string) => void;
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
  onImageData,
  onUploadError,
  onToolChange,
  onStatusMessage,
}: CanvasProps) {
  const { t } = useI18n();
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const displaySize = useCanvasDisplaySize({
    svgEl: editor?.svgEl ?? null,
  });
  const isVectorizeView = activeTool === 'vectorize';
  const canEdit = svgString !== null && editor !== null;
  const { replaceColor } = useSvgColors(editor?.svgEl ?? null);
  const vectorizeContainerRef = useRef<HTMLDivElement>(null);
  const vectorizeZoom = useSvgZoom({ containerRef: vectorizeContainerRef });
  const imageZoom = useImageZoom();

  const handleVectorizeSvgMount = useCallback(
    (svg: SVGSVGElement | null) => {
      if (svg) vectorizeZoom.attach(svg);
    },
    [vectorizeZoom.attach]
  );
  const handleCanvasStatusMessage = useCallback(
    (event: CanvasStatusEvent, detail?: string) => {
      if (event === 'colorPicked' && detail) {
        onStatusMessage(`${t('workspace.statusColorPicked')} ${detail}`);
      } else if (event === 'fillReplaced') {
        onStatusMessage(t('workspace.statusFillReplaced'));
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
    replaceColor,
    pushSnapshot: editor?.pushSnapshot ?? (() => {}),
    setSelectedPath: shapeTools.setSelectedPath,
    setEditingLabelPath: labelTools.setEditingPath,
    removePath: shapeTools.removePath,
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

  if (!imageData || activeTool === 'import') {
    return (
      <section
        aria-label={t('workspace.canvas')}
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-gray-200/60 p-4 sm:p-8 dark:bg-gray-950/60"
      >
        {uploadError && (
          <div
            role="alert"
            className="w-full max-w-lg rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          >
            {uploadError}
          </div>
        )}
        <div className="w-full max-w-lg">
          <ImageDropzone onImageData={handleUpload} onError={onUploadError} />
        </div>
      </section>
    );
  }

  if (!isVectorizeView && !canEdit) {
    return (
      <section
        aria-label={t('workspace.canvas')}
        className="flex min-w-0 flex-1 items-center justify-center bg-gray-200/60 dark:bg-gray-950/60"
      >
        <p className="text-sm text-gray-500">{t('vec.vectorizing')}</p>
      </section>
    );
  }

  const { processedImageData, svg, removeBg, handlePick, seeds, error } = vectorizeSession;
  const previewStyle = previewBackground === 'black' ? BLACK_BG : CHECKERBOARD_BG;
  const { containerRef, zoom, pushSnapshot, svgEl } = editor ?? {
    containerRef: { current: null },
    zoom: null,
    pushSnapshot: () => {},
    svgEl: null,
  };
  const { selectedPath, brushColor, brushSize } = shapeTools;
  const svgForPortals = svgEl as SVGSVGElement | null;
  const showEditorSurface = canEdit && !isVectorizeView;

  return (
    <section
      ref={canvasPanelRef}
      aria-label={t('workspace.canvas')}
      className="relative min-w-0 flex-1 overflow-hidden bg-gray-200/60 p-4 flex flex-col dark:bg-gray-950/60"
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
                  {svg && (
                    <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                      ({formatBytes(svgByteSize(svg))})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showOriginalPreview ? imageZoom.reset() : vectorizeZoom.reset()}
                    className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Reset zoom"
                  >
                    {Math.round((showOriginalPreview ? imageZoom.scale : vectorizeZoom.scale) * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!showOriginalPreview) vectorizeZoom.zoomIn(); }}
                    className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!showOriginalPreview) vectorizeZoom.zoomOut(); }}
                    className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOriginalPreview((v) => !v)}
                    className="focus-ring rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    aria-expanded={showOriginalPreview}
                  >
                    {showOriginalPreview ? t('vec.hideOriginal') : t('vec.showOriginal')}
                  </button>
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transparent-preview">
                <div
                  ref={vectorizeContainerRef}
                  className="w-full h-full"
                  style={{ visibility: showOriginalPreview ? 'hidden' : 'visible' }}
                  onPointerDown={vectorizeZoom.onPointerDown}
                  onPointerMove={vectorizeZoom.onPointerMove}
                  onPointerUp={vectorizeZoom.onPointerUp}
                  onPointerCancel={vectorizeZoom.onPointerUp}
                >
                  <SvgPreview svgString={svg} onSvgMount={handleVectorizeSvgMount} />
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
        <div className={isVectorizeView ? 'hidden' : undefined} aria-hidden={isVectorizeView}>
          <ZoomableSvgViewport
            containerRef={containerRef}
            zoom={zoom}
            displaySize={displaySize}
            onClick={showEditorSurface ? handleCanvasClick : undefined}
            onMouseMove={showEditorSurface ? handleCanvasMouseMove : undefined}
            className="relative flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
            style={{
              ...previewStyle,
              cursor: showEditorSurface ? cursor : undefined,
            }}
            aria-label="SVG editor canvas"
          />
          {showEditorSurface &&
            svgForPortals &&
            activeTool === 'nodes' &&
            selectedPath &&
            createPortal(
              <NodeEditor pathEl={selectedPath} svgEl={svgForPortals} onChange={pushSnapshot} />,
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
