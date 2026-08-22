'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ToolTooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

const SHOW_DELAY_MS = 400;
const GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 8;

export function ToolTooltip({ label, shortcut, children }: ToolTooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    flip: boolean;
  } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const show = () => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
  };

  const hide = () => {
    clearTimer();
    setOpen(false);
    setPosition(null);
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const width = tooltipRef.current?.offsetWidth ?? 0;
      const height = tooltipRef.current?.offsetHeight ?? 24;
      const flip =
        rect.right + GAP_PX + width > window.innerWidth - VIEWPORT_MARGIN_PX &&
        rect.left - GAP_PX - width >= VIEWPORT_MARGIN_PX;
      const rawTop = rect.top + rect.height / 2;
      const maxTop = window.innerHeight - height / 2 - VIEWPORT_MARGIN_PX;
      const top = Math.min(Math.max(rawTop, height / 2 + VIEWPORT_MARGIN_PX), maxTop);

      setPosition({
        left: flip ? rect.left - GAP_PX : rect.right + GAP_PX,
        top,
        flip,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {open && position
        ? createPortal(
            <span
              ref={tooltipRef}
              id={id}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
              className={`pointer-events-none fixed top-auto left-auto z-[60] -translate-y-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-surface shadow-lg dark:bg-dark-ink-muted dark:text-dark-bg ${
                position.flip ? '-translate-x-full' : ''
              }`}
            >
              {label}
              {shortcut ? (
                <span className="ml-2 font-mono text-ink-subtle dark:text-dark-bg">
                  {shortcut}
                </span>
              ) : null}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
