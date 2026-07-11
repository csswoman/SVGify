'use client';

import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'svgcraft:onboard:first-svg-tip';

interface FirstSvgTipProps {
  visible: boolean;
  /** True while the tip is on screen — parent can mute other guidance. */
  onActiveChange?: (active: boolean) => void;
}

export function FirstSvgTip({ visible, onActiveChange }: FirstSvgTipProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const active = Boolean(visible && dismissed === false);

  useEffect(() => {
    onActiveChange?.(active);
    return () => onActiveChange?.(false);
  }, [active, onActiveChange]);

  if (!active) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore quota / private mode
    }
  };

  return (
    <div
      role="status"
      className="flex shrink-0 items-start justify-between gap-3 border-t border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
    >
      <p className="min-w-0 text-pretty leading-relaxed text-gray-600 dark:text-gray-300">
        {t('onboard.firstSvgTip')}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        aria-label={t('onboard.dismissTip')}
      >
        <span className="max-sm:hidden">{t('onboard.gotIt')}</span>
        <X size={14} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
