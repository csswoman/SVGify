'use client';

import { useCallback, useState } from 'react';
import { ImageDropzone } from '@/components/upload/ImageDropzone';
import { ImagePreview } from '@/components/vectorize/ImagePreview';
import { SvgPreview } from '@/components/vectorize/SvgPreview';
import { PalettePreview } from '@/components/vectorize/PalettePreview';
import { ZoomableSvgViewport } from '@/components/shared/ZoomableSvgViewport';
import { formatBytes, svgByteSize } from '@/lib/optimizeSvg';
import { parseRgbString, rgbToHex } from '@/lib/colorUtils';
import { useSvgColors } from '@/hooks/useSvgColors';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import type { useWorkspaceSvg } from '@/hooks/useWorkspaceSvg';
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
  previewBackground: 'checkerboard' | 'black';
  selectedColor: RGBColor | null;
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
  previewBackground,
  selectedColor,
  onSelectedColorChange,
  onImageData,
  onUploadError,
  onToolChange,
}: CanvasProps) {
  const { t } = useI18n();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(
    (data: ImageData) => {
      setUploadError(null);
      onImageData(data);
      onToolChange('vectorize');
    },
    [onImageData, onToolChange]
  );

  if (!imageData || activeTool === 'import') {
    return (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-gray-200/60 p-8 dark:bg-gray-950/60">
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
            onError={(err) => {
              setUploadError(err);
              onUploadError(err);
            }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('upload.privacy')}</p>
      </main>
    );
  }

  if (activeTool === 'vectorize') {
    const {
      processedImageData,
      svg,
      removeBg,
      handlePick,
      seeds,
      error,
    } = vectorizeSession;

    return (
      <main className="min-w-0 flex-1 overflow-y-auto bg-gray-200/60 p-4 dark:bg-gray-950/60">
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
              label={removeBg ? t('vec.originalPick') : t('vec.original')}
              onPick={removeBg ? handlePick : undefined}
              seeds={removeBg ? seeds : undefined}
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('vec.vector')}
                {svg && (
                  <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">
                    ({formatBytes(svgByteSize(svg))})
                  </span>
                )}
              </p>
              <SvgPreview svgString={svg} />
            </div>
            <div className="xl:col-span-2">
              <PalettePreview svg={svg} />
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!svgString || !editor) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-gray-200/60 dark:bg-gray-950/60">
        <p className="text-sm text-gray-500">{t('vec.vectorizing')}</p>
      </main>
    );
  }

  const { containerRef, zoom, pushSnapshot, svgEl } = editor;
  const { replaceColor } = useSvgColors(svgEl);
  const previewStyle = previewBackground === 'black' ? BLACK_BG : CHECKERBOARD_BG;
  const useTransparent = activeTool === 'select' || activeTool === 'zoom' || activeTool === 'eyedropper';

  const handleSvgClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const path = target?.closest('path') as SVGPathElement | null;
    if (!path || !containerRef.current?.contains(path)) return;

    const fill = path.getAttribute('fill');
    if (!fill) return;
    const color = parseRgbString(fill);
    if (!color) return;

    if (activeTool === 'select' || activeTool === 'eyedropper') {
      onSelectedColorChange(color);
      return;
    }

    if (activeTool === 'fill' && selectedColor) {
      if (rgbToHex(color) !== rgbToHex(selectedColor)) {
        replaceColor(color, selectedColor);
        pushSnapshot();
      }
    }
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-gray-200/60 p-4 dark:bg-gray-950/60">
      <ZoomableSvgViewport
        containerRef={containerRef}
        zoom={zoom}
        onClick={handleSvgClick}
        className={`flex min-h-[28rem] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${
          useTransparent ? 'transparent-preview' : ''
        }`}
        style={useTransparent ? undefined : previewStyle}
        aria-label="SVG editor canvas"
      />
    </main>
  );
}
