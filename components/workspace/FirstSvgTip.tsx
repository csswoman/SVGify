'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

interface FirstSvgTipProps {
  /** Show when SVG is ready and guidance still applies. */
  visible: boolean;
  onGoFill: () => void;
  onGoOptimize: () => void;
  onDismiss: () => void;
  /** True while the tip is on screen — parent can mute other guidance. */
  onActiveChange?: (active: boolean) => void;
}

/**
 * Post-vectorize coach: one primary path (prepare), one quieter alternative (fill).
 * Refine stays on the toolbar — not a competing CTA here.
 */
export function FirstSvgTip({
  visible,
  onGoFill,
  onGoOptimize,
  onDismiss,
  onActiveChange,
}: FirstSvgTipProps) {
  const { t } = useI18n();

  useEffect(() => {
    onActiveChange?.(visible);
    return () => onActiveChange?.(false);
  }, [visible, onActiveChange]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t('onboard.nextStepsLabel')}
      className="flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-100">
          {t('onboard.nextStepsTitle')}
        </p>
        <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">
          {t('onboard.nextShapesHint')}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={onGoOptimize} className="btn-tertiary min-h-9 px-3 py-1.5 text-xs">
          {t('onboard.nextOptimize')}
        </button>
        <button
          type="button"
          onClick={onGoFill}
          className="focus-ring rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
        >
          {t('onboard.nextFill')}
          <kbd className="ml-1.5 hidden font-mono text-[10px] font-normal opacity-70 sm:inline">
            G
          </kbd>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label={t('onboard.nextStepsDismiss')}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
