'use client';

import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

const STEPS = ['workflow.step1', 'workflow.step2', 'workflow.step3', 'workflow.step4'] as const;

interface WorkflowStepsProps {
  activeStep?: 1 | 2 | 3 | 4;
  /** When true, starts collapsed so the inspector stays focused on the task. */
  defaultCollapsed?: boolean;
}

export function WorkflowSteps({ activeStep = 1, defaultCollapsed = false }: WorkflowStepsProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsed) {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {t('workflow.title')} · {activeStep}/4
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="focus-ring inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-expanded={false}
          aria-label={t('workflow.expand')}
        >
          {t('workflow.expand')}
          <CaretDown size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('workflow.title')}</h3>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="focus-ring inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-expanded={true}
          aria-label={t('workflow.collapse')}
        >
          {t('workflow.collapse')}
          <CaretUp size={12} aria-hidden />
        </button>
      </div>
      <ol className="space-y-1.5" aria-label={t('workflow.title')}>
        {STEPS.map((key, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const isActive = step === activeStep;
          const isDone = step < activeStep;

          return (
            <li
              key={key}
              className={[
                'flex gap-2 rounded-md px-2 py-1.5 text-xs leading-relaxed',
                isActive
                  ? 'bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-50'
                  : isDone
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-500 dark:text-gray-400',
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
