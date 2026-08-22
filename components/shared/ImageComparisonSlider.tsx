'use client';

import { useState, type ReactNode } from 'react';
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';

interface ImageComparisonSliderProps {
  before: ReactNode;
  children: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  ariaLabel: string;
  beforeInteractive?: boolean;
}

/**
 * Reveals the original image over the current result without moving either
 * preview, so differences remain easy to inspect at any slider position.
 */
export function ImageComparisonSlider({
  before,
  children,
  beforeLabel,
  afterLabel,
  ariaLabel,
  beforeInteractive = false,
}: ImageComparisonSliderProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {children}

      <div
        className={`absolute inset-0 z-10 overflow-hidden${beforeInteractive ? '' : ' pointer-events-none'}`}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {before}
        <span className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink-muted dark:border-dark-border dark:bg-dark-surface/95 dark:text-dark-ink-muted">
          {beforeLabel}
        </span>
      </div>

      <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink-muted dark:border-dark-border dark:bg-dark-surface/95 dark:text-dark-ink-muted">
        {afterLabel}
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-accent dark:bg-dark-accent"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 -rotate-90 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent dark:border-dark-accent dark:bg-dark-surface dark:text-dark-accent">
          <AnchorPointIcon className="h-4 w-4" />
        </span>
      </div>

      <label className="absolute left-0 top-1/2 z-30 block h-11 w-full -translate-y-1/2">
        <span className="sr-only">{ariaLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="focus-ring h-full w-full cursor-ew-resize opacity-0"
          aria-label={ariaLabel}
        />
      </label>
    </div>
  );
}
