'use client';

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

const STEPS = ['workflow.step1', 'workflow.step2', 'workflow.step3', 'workflow.step4'] as const;

interface WorkflowStepsProps {
  activeStep?: 1 | 2 | 3 | 4;
}

export function WorkflowSteps({ activeStep = 1 }: WorkflowStepsProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900">
        <span className="font-medium text-gray-600 dark:text-gray-300">{t('workflow.title')}</span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="focus-ring rounded border border-gray-200 px-2 py-1 font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t('workflow.expand')}
        >
          {t('workflow.expand')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('workflow.title')}
        </h3>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="focus-ring rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t('workflow.collapse')}
        >
          <span className="inline-flex items-center gap-1">
            {t('workflow.collapse')}
            <CaretDown size={12} aria-hidden />
          </span>
        </button>
      </div>
      <ol className="space-y-2" aria-label={t('workflow.title')}>
        {STEPS.map((key, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const isActive = step === activeStep;
          const isDone = step < activeStep;

          return (
            <li
              key={key}
              className={[
                'flex gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
                isActive
                  ? 'border-blue-200 bg-blue-50 text-gray-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-gray-100'
                  : isDone
                    ? 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                      ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                ].join(' ')}
                aria-hidden
              >
                {step}
              </span>
              <span>{t(key)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
