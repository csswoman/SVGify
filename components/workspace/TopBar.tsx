'use client';

import {
  ArrowCounterClockwise,
  ArrowClockwise,
  Globe,
  Moon,
  Sun,
} from '@phosphor-icons/react';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import type { LabelInfo } from '@/lib/labelUtils';

interface TopBarProps {
  svgString: string | null;
  labels?: LabelInfo[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function TopBar({
  svgString,
  labels = [],
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TopBarProps) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight">SVGcraft</span>
        <span className="hidden text-xs text-gray-400 sm:inline dark:text-gray-500">
          {t('app.tagline')}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('workspace.undo')}
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowCounterClockwise size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('workspace.redo')}
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowClockwise size={18} aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <DownloadButton
          svgString={svgString}
          labels={labels}
          fileName="vectorized.svg"
          label={t('workspace.download')}
        />
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {theme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          aria-label={`Switch language to ${t('lang.toggle')}`}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Globe size={16} aria-hidden />
          {t('lang.toggle')}
        </button>
      </div>
    </header>
  );
}
