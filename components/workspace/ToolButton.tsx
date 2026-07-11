'use client';

import type { Icon } from '@phosphor-icons/react';

interface ToolButtonProps {
  icon: Icon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ToolButton({
  icon: IconComponent,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: ToolButtonProps) {
  const accessibleName = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      type="button"
      aria-label={accessibleName}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={accessibleName}
      className={[
        'focus-ring flex w-full flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1.5 transition',
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
          : 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      <IconComponent
        size={20}
        weight={active ? 'fill' : 'regular'}
        className="shrink-0"
        aria-hidden
      />
      <span
        className={[
          'flex max-w-full items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-none',
          active
            ? 'text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-300',
        ].join(' ')}
      >
        <span className="truncate">{label}</span>
        {shortcut ? (
          <kbd className="shrink-0 font-mono text-[10px] font-semibold tracking-wide opacity-80">
            {shortcut}
          </kbd>
        ) : null}
      </span>
    </button>
  );
}
