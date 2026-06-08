'use client';

import { useI18n } from '@/lib/i18n';

interface ImportInspectorProps {
  onReplace: () => void;
}

export function ImportInspector({ onReplace }: ImportInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('upload.title')}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('upload.subtitle')}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{t('upload.formats')}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{t('upload.privacy')}</p>
      <button
        type="button"
        onClick={onReplace}
        className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {t('workspace.replaceImage')}
      </button>
    </div>
  );
}
