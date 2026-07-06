'use client';

import { ZoomControls } from '@/components/shared/ZoomControls';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';

type PreviewBackground = 'checkerboard' | 'black';

interface StatusBarProps {
  pathCount: number | null;
  byteSize: number | null;
  activeTool: WorkspaceTool;
  statusMessage?: string | null;
  hasSvg?: boolean;
  isPreTrace?: boolean;
  zoomScale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  previewBackground?: PreviewBackground;
  onPreviewBackgroundChange?: (bg: PreviewBackground) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function StatusBar({
  pathCount,
  byteSize,
  activeTool,
  statusMessage,
  hasSvg = false,
  isPreTrace = false,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  previewBackground,
  onPreviewBackgroundChange,
}: StatusBarProps) {
  const { t } = useI18n();
  const showViewControls =
    hasSvg &&
    zoomScale !== undefined &&
    onZoomIn &&
    onZoomOut &&
    onZoomReset &&
    previewBackground &&
    onPreviewBackgroundChange;

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {statusMessage && (
        <span aria-live="polite" className="sr-only">
          {statusMessage}
        </span>
      )}
      <div className="flex items-center gap-3">
        {isPreTrace ? (
          <span>{t('vec.notTracedYet')}</span>
        ) : (
          <>
            <span>
              {pathCount ?? 0} {t('workspace.paths')}
            </span>
            <span>{byteSize !== null ? formatBytes(byteSize) : '0 B'}</span>
          </>
        )}
      </div>

      {showViewControls && (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-600 dark:bg-gray-900"
            role="group"
            aria-label={t('shape.previewBg')}
          >
            {(['checkerboard', 'black'] as PreviewBackground[]).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => onPreviewBackgroundChange(bg)}
                className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
                  previewBackground === bg
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                aria-pressed={previewBackground === bg}
              >
                {bg === 'checkerboard' ? t('shape.bgCheckerboard') : t('shape.bgSolid')}
              </button>
            ))}
          </div>
          <ZoomControls
            scale={zoomScale}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onZoomReset}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <span>{t(`tool.${activeTool}`)}</span>
        {showViewControls && (
          <span className="max-lg:hidden text-gray-400 dark:text-gray-500">{t('zoom.panHint')}</span>
        )}
        <span className="max-sm:hidden sm:inline">{t('workspace.shortcutHint')}</span>
      </div>
    </footer>
  );
}
