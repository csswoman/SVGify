'use client';

import Link from 'next/link';
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  Globe,
  Moon,
  Sidebar,
  Sun,
  X,
} from '@phosphor-icons/react';
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';
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
    <header className="relative z-50 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-surface px-3 py-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-4 dark:border-dark-border dark:bg-dark-surface">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          aria-label="SVGify"
          className="focus-ring flex min-w-0 items-center gap-2.5 rounded-md"
        >
          <AnchorPointIcon className="h-6 w-6 shrink-0 text-ink dark:text-dark-ink" />
          <span
            className="block truncate text-[1.75rem] leading-[1.1] font-bold tracking-[-0.03em] text-ink dark:text-dark-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            SVGify
          </span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 dark:bg-dark-success-soft sm:inline-flex">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success dark:bg-dark-success" aria-hidden />
          <span className="text-[11px] font-medium text-ink dark:text-dark-ink">
            {t('app.badge')}
          </span>
        </span>
      </div>

      <div className="hidden items-center gap-0.5 justify-self-center lg:flex">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('workspace.undo')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-40 dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken"
        >
          <ArrowCounterClockwise size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('workspace.redo')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken disabled:opacity-40 dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken"
        >
          <ArrowClockwise size={18} aria-hidden />
        </button>
      </div>

      <div className="flex items-center justify-self-end gap-1.5">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5 lg:hidden dark:border-dark-border dark:bg-dark-surface-sunken">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t('workspace.undo')}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface disabled:opacity-40 dark:text-dark-ink-muted dark:hover:bg-dark-surface"
          >
            <ArrowCounterClockwise size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={t('workspace.redo')}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface disabled:opacity-40 dark:text-dark-ink-muted dark:hover:bg-dark-surface"
          >
            <ArrowClockwise size={18} aria-hidden />
          </button>
        </div>
        {payload ? (
          <DownloadButton
            payload={payload}
            fileName="vectorized.svg"
            prepared={downloadPrepared}
            highlight={downloadHighlight}
            onDownloaded={onDownloadComplete}
          />
        ) : null}
        {downloadPrepared ? (
          <span className="hidden rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success-text lg:inline-flex dark:bg-dark-success-soft dark:text-dark-success">
            {t('workspace.readyToDownload')}
          </span>
        ) : null}
        {showInspectorToggle ? (
          <button
            type="button"
            onClick={onInspectorToggle}
            aria-label={inspectorOpen ? t('workspace.closeInspector') : t('workspace.openInspector')}
            aria-pressed={inspectorOpen}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface-sunken inspector:hidden dark:border-dark-border dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken"
          >
            {inspectorOpen ? <X size={18} aria-hidden /> : <Sidebar size={18} aria-hidden />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={nextTheme === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight')}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface-sunken dark:border-dark-border dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken"
        >
          {theme === 'light' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          aria-label={`${t('theme.switchLang')}: ${t('lang.current')}`}
          className="focus-ring flex h-10 items-center gap-1 rounded-md border border-border px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-sunken dark:border-dark-border dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken"
        >
          <Globe size={16} aria-hidden />
          {t('lang.toggle')}
        </button>
      </div>
    </header>
  );
}
