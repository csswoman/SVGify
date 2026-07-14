'use client';

import { useState, useId } from 'react';
import { useI18n } from '@/lib/i18n';

interface TooltipProps {
  /** The help text shown on hover/focus. */
  text: string;
  /** Accessible label for the trigger (defaults to translated “More information”). */
  label?: string;
  /** Use inside another button/link — renders a span instead of a nested button. */
  nested?: boolean;
}

/**
 * Small "?" info trigger with an accessible tooltip. Shows on hover and on
 * keyboard focus; describes the adjacent control via aria-describedby.
 * Hit target is ≥44×44 for touch; the visual glyph stays compact.
 */
const triggerClassName =
  'focus-ring relative ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-300';

const glyphClassName =
  'flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600';

function stopPropagation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function Tooltip({ text, label, nested = false }: TooltipProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const accessibleLabel = label ?? t('a11y.moreInfo');

  const tooltip = open ? (
    <span
      id={id}
      role="tooltip"
      className="absolute bottom-full left-1/2 z-50 mb-2 w-52 max-w-[min(13rem,70vw)] -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs font-normal leading-snug text-pretty text-white shadow-lg"
    >
      {text}
    </span>
  ) : null;

  if (nested) {
    return (
      <span className="group relative inline-flex items-center">
        <span
          role="img"
          aria-label={accessibleLabel}
          aria-describedby={open ? id : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
          className={triggerClassName}
        >
          <span className={glyphClassName} aria-hidden>
            ?
          </span>
        </span>
        {tooltip}
      </span>
    );
  }

  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={accessibleLabel}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={triggerClassName}
      >
        <span className={glyphClassName} aria-hidden>
          ?
        </span>
      </button>
      {tooltip}
    </span>
  );
}
