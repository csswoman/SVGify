'use client';

import { useCallback, useRef } from 'react';
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
import { useVectorizePreviewSizes } from '@/hooks/useVectorizePreviewSizes';
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
}: CanvasProps) {
  const { t } = useI18n();
  const canvasPanelRef = useRef<HTMLElement>(null);
  const vectorizePanelRef = useRef<HTMLElement>(null);
  const displaySize = useCanvasDisplaySize({
    svgEl: editor?.svgEl ?? null,
    panelRef: canvasPanelRef,
  });
  const vectorizePreviewSizes = useVectorizePreviewSizes({
    panelRef: vectorizePanelRef,
    imageData: activeTool === 'vectorize' ? vectorizeSession.processedImageData : null,
    svgString: activeTool === 'vectorize' ? vectorizeSession.svg : null,
  });
  const { replaceColor } = useSvgColors(editor?.svgEl ?? null);
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
          <ImageDropzone
            onImageData={handleUpload}
            onError={onUploadError}
          />
        </div>
      </section>
    );
  }

  if (activeTool === 'vectorize') {
    const { processedImageData, svg, removeBg, handlePick, seeds, error } = vectorizeSession;

    return (
      <section
        ref={vectorizePanelRef}
        aria-label={t('workspace.canvas')}
        className="min-w-0 flex-1 overflow-y-auto bg-gray-200/60 p-4 dark:bg-gray-950/60"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}
        {processedImageData && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ImagePreview
              imageData={processedImageData}
              displaySize={vectorizePreviewSizes.image}
              label={removeBg ? t('vec.originalPick') : t('vec.original')}
              onPick={removeBg ? handlePick : undefined}
              seeds={removeBg ? seeds : undefined}
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('vec.vector')}
                {svg && (
                  <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                    ({formatBytes(svgByteSize(svg))})
                  </span>
                )}
              </p>
              <SvgPreview svgString={svg} displaySize={vectorizePreviewSizes.svg} />
            </div>
            <div className="xl:col-span-2">
              <PalettePreview svg={svg} />
            </div>
          </div>
        )}
      </section>
    );
  }

  if (!svgString || !editor) {
    return (
      <section
        aria-label={t('workspace.canvas')}
        className="flex min-w-0 flex-1 items-center justify-center bg-gray-200/60 dark:bg-gray-950/60"
      >
        <p className="text-sm text-gray-500">{t('vec.vectorizing')}</p>
      </section>
    );
  }

  const { containerRef, zoom, pushSnapshot, svgEl } = editor;
  const { selectedPath, brushColor, brushSize } = shapeTools;
  const previewStyle = previewBackground === 'black' ? BLACK_BG : CHECKERBOARD_BG;
  const useTransparent =
    activeTool === 'zoom' ||
    activeTool === 'eyedropper' ||
    activeTool === 'labels';

  const svgForPortals = svgEl as SVGSVGElement | null;

  return (
    <section
      ref={canvasPanelRef}
      aria-label={t('workspace.canvas')}
      className="min-w-0 flex-1 overflow-y-auto bg-gray-200/60 p-4 dark:bg-gray-950/60"
    >
      <ZoomableSvgViewport
        containerRef={containerRef}
        zoom={zoom}
        displaySize={displaySize}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${
          useTransparent ? 'transparent-preview' : ''
        }`}
        style={{
          ...(useTransparent ? undefined : previewStyle),
          cursor: activeTool === 'zoom' ? undefined : cursor,
        }}
        aria-label="SVG editor canvas"
      />
      {svgForPortals &&
        activeTool === 'nodes' &&
        selectedPath &&
        createPortal(
          <NodeEditor pathEl={selectedPath} svgEl={svgForPortals} onChange={pushSnapshot} />,
          svgForPortals
        )}
      {svgForPortals &&
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
    </section>
  );
}
