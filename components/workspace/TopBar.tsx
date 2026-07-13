'use client';

import {
  ArrowCounterClockwise,
  ArrowClockwise,
  Globe,
  Moon,
  Sidebar,
  Sun,
  X,
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
  inspectorOpen: boolean;
  onInspectorToggle: () => void;
  downloadHighlight?: boolean;
  downloadPrepared?: boolean;
  onDownloadComplete?: () => void;
}

export function TopBar({
  svgString,
  labels = [],
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inspectorOpen,
  onInspectorToggle,
  downloadHighlight = false,
  downloadPrepared = false,
  onDownloadComplete,
}: TopBarProps) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-[1.125rem] font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
          SVGcraft
        </span>
        <span className="hidden truncate text-xs text-gray-500 sm:inline dark:text-gray-400">
          {t('app.tagline')}
        </span>
      </div>

      <div className="flex items-center gap-0.5 justify-self-center">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('workspace.undo')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowCounterClockwise size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('workspace.redo')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowClockwise size={18} aria-hidden />
        </button>
      </div>

      <div className="flex items-center justify-self-end gap-1.5">
        {svgString ? (
          <DownloadButton
            svgString={svgString}
            labels={labels}
            fileName="vectorized.svg"
            prepared={downloadPrepared}
            highlight={downloadHighlight}
            onDownloaded={onDownloadComplete}
          />
        ) : null}
        <button
          type="button"
          onClick={onInspectorToggle}
          aria-label={inspectorOpen ? t('workspace.closeInspector') : t('workspace.openInspector')}
          aria-pressed={inspectorOpen}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 lg:hidden dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {inspectorOpen ? <X size={18} aria-hidden /> : <Sidebar size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={nextTheme === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {theme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          aria-label={`${t('theme.switchLang')}: ${t('lang.current')}`}
          className="focus-ring flex h-10 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Globe size={16} aria-hidden />
          {t('lang.toggle')}
        </button>
      </div>
    </header>
  );
}
