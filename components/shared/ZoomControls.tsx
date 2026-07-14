'use client';

import { DEFAULT_ZOOM_SCALE, MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from '@/types/svg.types';
import { useI18n } from '@/lib/i18n';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const { t } = useI18n();
  const atMin = scale <= MIN_ZOOM_SCALE;
  const atMax = scale >= MAX_ZOOM_SCALE;
  const atDefault = Math.abs(scale - DEFAULT_ZOOM_SCALE) < 0.01;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-900">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={atMin}
        className="focus-ring min-h-10 min-w-10 rounded px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label={t('zoom.out')}
      >
        −
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={atDefault}
        className="focus-ring min-h-10 min-w-[3.5rem] rounded px-2 py-1 font-mono text-xs text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label={t('zoom.reset')}
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={atMax}
        className="focus-ring min-h-10 min-w-10 rounded px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label={t('zoom.in')}
      >
        +
      </button>
    </div>
  );
}
