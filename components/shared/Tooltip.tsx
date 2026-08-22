'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  'focus-ring relative ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-ink-muted dark:text-dark-ink-muted';

const glyphClassName =
  'flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken dark:bg-dark-surface-sunken group-hover:bg-border dark:group-hover:bg-dark-border';

function stopPropagation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function Tooltip({ text, label, nested = false }: TooltipProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const id = useId();
  const accessibleLabel = label ?? t('a11y.moreInfo');

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(208, window.innerWidth - 24);
      const gap = 8;
      const canPlaceAbove = rect.top >= 72;
      const top = canPlaceAbove ? rect.top - gap : rect.bottom + gap;
      const left = Math.max(
        12,
        Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)
      );

      setPosition({ left, top, placement: canPlaceAbove ? 'top' : 'bottom' });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const closeTooltip = () => {
    setOpen(false);
    setPosition(null);
  };

  const tooltip = open && position && typeof document !== 'undefined'
    ? createPortal(
        <span
          id={id}
          role="tooltip"
          className={`fixed z-[60] w-52 max-w-[calc(100vw-1.5rem)] -translate-x-0 -translate-y-full rounded-md bg-ink px-3 py-2 text-xs font-normal leading-snug text-pretty text-surface shadow-lg dark:bg-dark-ink-muted dark:text-dark-bg ${
            position.placement === 'bottom' ? 'translate-y-0' : ''
          }`}
          style={{ left: position.left, top: position.top }}
        >
          {text}
        </span>,
        document.body
      )
    : null;

  if (nested) {
    return (
      <span className="group relative inline-flex items-center">
        <span
          ref={triggerRef}
          role="img"
          aria-label={accessibleLabel}
          aria-describedby={open ? id : undefined}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={closeTooltip}
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
        ref={(node) => {
          triggerRef.current = node;
        }}
        type="button"
        aria-label={accessibleLabel}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={closeTooltip}
        onFocus={() => setOpen(true)}
        onBlur={closeTooltip}
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
