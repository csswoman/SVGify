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

interface TopBarProps {
  payload: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  inspectorOpen: boolean;
  onInspectorToggle: () => void;
  /** Hide mobile inspector toggle when the inspector column is unavailable. */
  showInspectorToggle?: boolean;
  downloadHighlight?: boolean;
  downloadPrepared?: boolean;
  onDownloadComplete?: () => void;
}

export function TopBar({
  payload,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inspectorOpen,
  onInspectorToggle,
  showInspectorToggle = true,
  downloadHighlight = false,
  downloadPrepared = false,
  onDownloadComplete,
}: TopBarProps) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-200 bg-white px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <span className="block text-[1.125rem] font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
            SVGify
          </span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {t('app.tagline')}
          </span>
        </div>
        <span className="hidden rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 xl:inline-flex dark:bg-gray-900 dark:text-gray-400">
          {t('workspace.localOnly')}
        </span>
      </div>

      <div className="hidden items-center gap-0.5 justify-self-center lg:flex">
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
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 lg:hidden dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t('workspace.undo')}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-white disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowCounterClockwise size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={t('workspace.redo')}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-white disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowClockwise size={18} aria-hidden />
          </button>
        </div>
        {payload ? (
          <DownloadButton
            payload={payload}
            fileName="vectorized.svg"
            label={t('workspace.download')}
            prepared={downloadPrepared}
            highlight={downloadHighlight}
            onDownloaded={onDownloadComplete}
          />
        ) : null}
        {downloadPrepared ? (
          <span className="hidden rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 lg:inline-flex dark:bg-green-950/40 dark:text-green-300">
            {t('workspace.readyToDownload')}
          </span>
        ) : null}
        {showInspectorToggle ? (
          <button
            type="button"
            onClick={onInspectorToggle}
            aria-label={inspectorOpen ? t('workspace.closeInspector') : t('workspace.openInspector')}
            aria-pressed={inspectorOpen}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 lg:hidden dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {inspectorOpen ? <X size={18} aria-hidden /> : <Sidebar size={18} aria-hidden />}
          </button>
        ) : null}
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
