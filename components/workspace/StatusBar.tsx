'use client';

import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';

interface StatusBarProps {
  pathCount: number;
  byteSize: number;
  zoomPercent: number;
  activeTool: WorkspaceTool;
  statusMessage?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function StatusBar({ pathCount, byteSize, zoomPercent, activeTool, statusMessage }: StatusBarProps) {
  const { t } = useI18n();

  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
      {statusMessage && (
        <span aria-live="polite" className="sr-only">
          {statusMessage}
        </span>
      )}
      <div className="flex items-center gap-3">
        <span>
          {pathCount} {t('workspace.paths')}
        </span>
        <span>{formatBytes(byteSize)}</span>
        <span>{zoomPercent}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{t(`tool.${activeTool}`)}</span>
        <span className="max-sm:hidden sm:inline">{t('workspace.shortcutHint')}</span>
      </div>
    </footer>
  );
}
