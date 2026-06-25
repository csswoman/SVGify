'use client';

import { useState, useId } from 'react';

interface TooltipProps {
  /** The help text shown on hover/focus. */
  text: string;
  /** Accessible label for the trigger (defaults to "More information"). */
  label?: string;
  /** Use inside another button/link — renders a span instead of a nested button. */
  nested?: boolean;
}

/**
 * Small "?" info trigger with an accessible tooltip. Shows on hover and on
 * keyboard focus; describes the adjacent control via aria-describedby.
 */
const triggerClassName =
  'ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500';

function stopPropagation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function Tooltip({ text, label = 'More information', nested = false }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const tooltip = open ? (
    <span
      id={id}
      role="tooltip"
      className="absolute bottom-full left-1/2 z-10 mb-2 w-52 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg"
    >
      {text}
    </span>
  ) : null;

  if (nested) {
    return (
      <span className="relative inline-flex items-center">
        <span
          role="img"
          aria-label={label}
          aria-describedby={open ? id : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
          className={triggerClassName}
        >
          ?
        </span>
        {tooltip}
      </span>
    );
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={triggerClassName}
      >
        ?
      </button>
      {tooltip}
    </span>
  );
}
