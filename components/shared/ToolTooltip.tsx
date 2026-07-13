'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface ToolTooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

const SHOW_DELAY_MS = 400;

export function ToolTooltip({ label, shortcut, children }: ToolTooltipProps) {
  const [open, setOpen] = useState(false);
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
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow-lg dark:bg-gray-950"
        >
          {label}
          {shortcut ? (
            <span className="ml-2 font-mono text-gray-300">{shortcut}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
