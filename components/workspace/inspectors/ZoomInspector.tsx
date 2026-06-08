'use client';

import { useI18n } from '@/lib/i18n';

type PreviewBackground = 'checkerboard' | 'black';

interface ZoomInspectorProps {
  previewBackground: PreviewBackground;
  onPreviewBackgroundChange: (bg: PreviewBackground) => void;
}

export function ZoomInspector({ previewBackground, onPreviewBackgroundChange }: ZoomInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.zoom')}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('zoom.panHint')}</p>
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900">
        {(['checkerboard', 'black'] as PreviewBackground[]).map((bg) => (
          <button
            key={bg}
            type="button"
            onClick={() => onPreviewBackgroundChange(bg)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              previewBackground === bg
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            aria-pressed={previewBackground === bg}
          >
            {bg === 'checkerboard' ? t('shape.bgCheckerboard') : t('shape.bgBlack')}
          </button>
        ))}
      </div>
    </div>
  );
}
