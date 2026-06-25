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
  return (
    <button
      type="button"
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        'focus-ring flex w-full min-h-11 items-center justify-center gap-2 rounded-md border px-2 transition lg:justify-start',
        active
          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
          : 'border-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      <IconComponent
        size={18}
        weight={active ? 'fill' : 'regular'}
        className="shrink-0"
        aria-hidden
      />
      <span className="hidden min-w-0 flex-1 truncate text-left text-xs font-medium lg:inline">
        {label}
      </span>
      {shortcut && (
        <kbd className="hidden shrink-0 rounded border border-gray-200 px-1 py-0.5 font-mono text-[10px] font-normal text-gray-500 lg:inline dark:border-gray-600 dark:text-gray-400">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
