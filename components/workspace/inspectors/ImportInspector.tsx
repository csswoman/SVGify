'use client';

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

  if (hasImage) {
    return (
      <div className="space-y-4">
        <WorkflowSteps activeStep={activeStep} />
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('workspace.importReplaceHint')}</p>
        <button
          type="button"
          onClick={onReplace}
          className="focus-ring w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t('workspace.replaceImage')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('upload.title')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t('upload.formats')}</p>
      </div>
      <WorkflowSteps activeStep={1} />
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
        {t('upload.privacy')}
      </p>
    </div>
  );
}
