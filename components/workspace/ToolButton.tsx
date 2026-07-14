'use client';

import type { Icon } from '@phosphor-icons/react';
import { ToolTooltip } from '@/components/shared/ToolTooltip';

interface ToolButtonProps {
  icon: Icon;
  label: string;
  shortcut?: string;
  /** Selected tool (blue ring). Mutually exclusive with mode-only expanded. */
  active?: boolean;
  /** Mode toggle engaged without claiming the selected-tool ring. */
  expanded?: boolean;
  /** Quiet discovery cue (visual only; no “New” marketing copy). */
  badge?: boolean;
  disabled?: boolean;
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
  onClick,
}: ToolButtonProps) {
  const accessibleName = shortcut ? `${label} (${shortcut})` : label;
  const filled = Boolean(active || expanded);

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
          'focus-ring relative flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-150 ease-out',
          active
            ? 'border-action-blue bg-action-blue-surface text-action-blue dark:bg-blue-950/50 dark:text-blue-300'
            : expanded
              ? 'border-transparent text-action-blue dark:text-blue-300'
              : 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        ].join(' ')}
      >
        <IconComponent
          size={20}
          weight={filled ? 'fill' : 'regular'}
          aria-hidden
        />
        {badge ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-action-blue ring-2 ring-white dark:ring-gray-800"
            aria-hidden
          />
        ) : null}
      </button>
    </ToolTooltip>
  );
}
