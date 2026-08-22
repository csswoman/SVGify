'use client';

import type { Icon } from '@phosphor-icons/react';
import { ToolTooltip } from '@/components/shared/ToolTooltip';
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';

interface ToolButtonProps {
  icon: Icon;
  label: string;
  shortcut?: string;
  /** Selected tool (accent anchor-point indicator). Mutually exclusive with mode-only expanded. */
  active?: boolean;
  /** Mode toggle engaged without claiming the selected-tool indicator. */
  expanded?: boolean;
  /** Quiet discovery cue (visual only; no “New” marketing copy). */
  badge?: boolean;
  disabled?: boolean;
  mode?: 'icon' | 'row';
  onClick: () => void;
}

export function ToolButton({
  icon: IconComponent,
  label,
  shortcut,
  active,
  expanded,
  badge,
  disabled,
  mode = 'icon',
  onClick,
}: ToolButtonProps) {
  const accessibleName = shortcut ? `${label} (${shortcut})` : label;
  const filled = Boolean(active || expanded);
  const isRow = mode === 'row';

  return (
    <ToolTooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-label={accessibleName}
        aria-pressed={active === undefined ? undefined : active}
        aria-expanded={expanded === undefined ? undefined : expanded}
        disabled={disabled ? true : undefined}
        onClick={onClick}
        className={[
          'focus-ring relative flex min-h-11 items-center rounded-md border transition-colors duration-150 ease-out',
          isRow
            ? 'w-full justify-start gap-3 px-3 py-2 text-left'
            : 'h-10 w-10 justify-center',
          active || expanded
            ? 'border-transparent text-accent dark:text-dark-accent'
            : 'border-transparent text-ink-muted hover:bg-surface-sunken dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        ].join(' ')}
      >
        {active ? (
          <AnchorPointIcon
            className="absolute -left-1 h-3 w-3 text-accent dark:text-dark-accent"
            aria-hidden
          />
        ) : null}
        <IconComponent
          size={20}
          weight={filled ? 'fill' : 'regular'}
          aria-hidden
        />
        {isRow ? (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate text-sm font-medium">{label}</span>
            {shortcut ? (
              <span className="font-mono text-[11px] uppercase text-ink-subtle dark:text-dark-ink-subtle">
                {shortcut}
              </span>
            ) : null}
          </span>
        ) : null}
        {badge ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface dark:bg-dark-accent dark:ring-dark-surface"
            aria-hidden
          />
        ) : null}
      </button>
    </ToolTooltip>
  );
}
