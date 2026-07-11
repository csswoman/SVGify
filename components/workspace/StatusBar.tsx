'use client';

import { ZoomControls } from '@/components/shared/ZoomControls';
import { useI18n, type TKey } from '@/lib/i18n';
import { DEFAULT_ZOOM_SCALE } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

type PreviewBackground = 'checkerboard' | 'black';

const TOOL_HINT_KEYS: Partial<Record<WorkspaceTool, TKey>> = {
  import: 'tool.import.hint',
  vectorize: 'tool.vectorize.hint',
  fill: 'tool.fill.hint',
  eyedropper: 'tool.eyedropper.hint',
  erase: 'tool.erase.hint',
  erasePath: 'tool.erasePath.hint',
  brush: 'tool.brush.hint',
  nodes: 'tool.nodes.hint',
  labels: 'tool.labels.hint',
  optimize: 'tool.optimize.hint',
};

interface StatusBarProps {
  pathCount: number | null;
  byteSize: number | null;
  activeTool: WorkspaceTool;
  statusMessage?: string | null;
  /** When true, hide ambient tool hints (one-shot tip owns guidance). */
  suppressGuidance?: boolean;
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
  suppressGuidance = false,
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
  const showZoom =
    zoomScale !== undefined && onZoomIn && onZoomOut && onZoomReset;
  const showPreviewBg = Boolean(previewBackground && onPreviewBackgroundChange);
  const showViewControls = showZoom || showPreviewBg;
  const showPanHint =
    showZoom && zoomScale !== undefined && Math.abs(zoomScale - DEFAULT_ZOOM_SCALE) > 0.01;

  const toolHintKey = TOOL_HINT_KEYS[activeTool];
  const ambientHint =
    suppressGuidance
      ? null
      : hasSvg && activeTool === 'vectorize'
        ? t('workspace.moreToolsAfterVectorize')
        : toolHintKey
          ? t(toolHintKey)
          : null;
  const hint = statusMessage || ambientHint;

  return (
    <footer className="grid shrink-0 grid-cols-1 items-center gap-x-4 gap-y-1.5 border-t border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 sm:grid-cols-[minmax(0,1fr)_auto_auto] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {isPreTrace ? (
          <span>{t('vec.notTracedYet')}</span>
        ) : (
          <span className="inline-flex items-center gap-2 font-mono tabular-nums">
            <span>
              {pathCount ?? 0} {t('workspace.paths')}
            </span>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden>
              ·
            </span>
            <span>{byteSize !== null ? formatBytes(byteSize) : '0 B'}</span>
          </span>
        )}
        {hint && (
          <span
            aria-live="polite"
            className="min-w-0 max-w-md text-pretty text-gray-500 dark:text-gray-400"
          >
            {hint}
          </span>
        )}
      </div>

      {showViewControls ? (
        <div className="flex flex-wrap items-center justify-self-start gap-2 sm:justify-self-center">
          {showPreviewBg && previewBackground && onPreviewBackgroundChange && (
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
                  className={`min-h-8 rounded px-2 py-1 text-[11px] font-medium transition ${
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
          )}
          {showZoom && onZoomIn && onZoomOut && onZoomReset && (
            <ZoomControls
              scale={zoomScale}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onReset={onZoomReset}
            />
          )}
        </div>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}

      <div className="flex flex-wrap items-center justify-self-start gap-3 sm:justify-self-end">
        <span className="text-gray-500 dark:text-gray-400">{t(`tool.${activeTool}`)}</span>
        {showPanHint && (
          <span className="max-lg:hidden text-gray-400 dark:text-gray-500">{t('zoom.panHint')}</span>
        )}
      </div>
    </footer>
  );
}
