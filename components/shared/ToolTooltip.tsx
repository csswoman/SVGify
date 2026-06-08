'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface ToolTooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

export function ToolTooltip({ label, shortcut, children }: ToolTooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    timer.current = setTimeout(() => setOpen(true), 400);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow-lg dark:bg-gray-950"
        >
          {label}
          {shortcut && <span className="ml-2 text-gray-400">{shortcut}</span>}
        </span>
      )}
    </span>
  );
}
