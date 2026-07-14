'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface ImportInspectorProps {
  onReplace: () => void;
}

/** Replace-image controls — only shown after a document is loaded. */
export function ImportInspector({ onReplace }: ImportInspectorProps) {
  const { t } = useI18n();
  const [confirmReplace, setConfirmReplace] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('workspace.replaceImage')}
        </h2>
        <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">
          {t('workspace.importReplaceHint')}
        </p>
      </div>
      {confirmReplace ? (
        <div
          role="group"
          aria-label={t('workspace.replaceImage')}
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="text-pretty text-xs text-amber-950 dark:text-amber-100">
            {t('workspace.replaceImage.confirm')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setConfirmReplace(false);
                onReplace();
              }}
              className="btn-tertiary flex-1"
            >
              {t('workspace.replaceImage.confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReplace(false)}
              className="btn-tertiary flex-1"
            >
              {t('workspace.replaceImage.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmReplace(true)}
          className="btn-tertiary w-full"
        >
          {t('workspace.replaceImage')}
        </button>
      )}
    </div>
  );
}
