'use client';

import type { ReactNode } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

interface InspectorDisclosureProps {
  title: string;
  summary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/** Collapsible inspector block — shared by Vectorize, Optimize, and settings panels. */
export function InspectorDisclosure({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: InspectorDisclosureProps) {
  return (
    <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-2 rounded py-1 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</span>
          {!open && summary ? (
            <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{summary}</span>
          ) : null}
        </span>
        {open ? (
          <CaretUp size={14} className="shrink-0 text-gray-400" aria-hidden />
        ) : (
          <CaretDown size={14} className="shrink-0 text-gray-400" aria-hidden />
        )}
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}
