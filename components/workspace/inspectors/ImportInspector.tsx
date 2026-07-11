'use client';

import { useState } from 'react';
import { WorkflowSteps } from '@/components/workspace/WorkflowSteps';
import { useI18n } from '@/lib/i18n';

interface ImportInspectorProps {
  hasImage: boolean;
  hasSvg: boolean;
  onReplace: () => void;
}

export function ImportInspector({ hasImage, hasSvg, onReplace }: ImportInspectorProps) {
  const { t } = useI18n();
  const activeStep = hasSvg ? 3 : hasImage ? 2 : 1;
  const [confirmReplace, setConfirmReplace] = useState(false);

  if (hasImage) {
    return (
      <div className="space-y-4">
        <WorkflowSteps activeStep={activeStep} defaultCollapsed />
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('workspace.importReplaceHint')}</p>
        {confirmReplace ? (
          <div
            role="group"
            aria-label={t('workspace.replaceImage')}
            className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <p className="text-xs text-amber-950 dark:text-amber-100">
              {t('workspace.replaceImage.confirm')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setConfirmReplace(false);
                  onReplace();
                }}
                className="focus-ring min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('workspace.replaceImage.confirmAction')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReplace(false)}
                className="focus-ring min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-900/40"
              >
                {t('workspace.replaceImage.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReplace(true)}
            className="focus-ring min-h-11 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('workspace.replaceImage')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('onboard.inspectorTitle')}
        </h2>
        <p className="text-pretty text-xs text-gray-600 dark:text-gray-300">
          {t('onboard.inspectorBody')}
        </p>
      </div>
      <WorkflowSteps activeStep={1} />
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
        {t('upload.privacy')}
      </p>
    </div>
  );
}
