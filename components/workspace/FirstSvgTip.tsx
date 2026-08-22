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
 * Shape tools stay on the toolbar — not competing CTAs here.
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
      className="flex shrink-0 flex-col gap-3 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-dark-border dark:bg-dark-surface"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">
          {t('onboard.nextStepsTitle')}
        </p>
        <p className="mt-1 max-w-xl text-xs text-ink-muted dark:text-dark-ink-muted">
          {t('optimize.prepare.help')}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={onGoOptimize} className="btn-secondary !min-h-10 px-3 py-1.5 text-xs">
          {t('onboard.nextOptimize')}
        </button>
        <button
          type="button"
          onClick={onGoFill}
          className="focus-ring rounded-md px-2 py-1.5 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline dark:text-dark-ink-muted dark:hover:text-dark-ink"
        >
          {t('onboard.nextFill')}
          <kbd className="ml-1.5 hidden font-mono text-[10px] font-normal opacity-70 sm:inline">
            G
          </kbd>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-sunken hover:text-ink dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken dark:hover:text-dark-ink"
          aria-label={t('onboard.nextStepsDismiss')}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
