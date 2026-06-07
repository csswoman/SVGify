'use client';

import { LabelInfo } from '@/lib/labelUtils';

interface LabelSidebarProps {
  labels: LabelInfo[];
  onLabelClick: (label: string) => void;
  selectedLabel: string | null;
}

export function LabelSidebar({ labels, onLabelClick, selectedLabel }: LabelSidebarProps) {
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.label)));

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Labels {uniqueLabels.length > 0 && `(${uniqueLabels.length})`}
      </p>
      {uniqueLabels.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Enable Label Mode, then click a path to name it.
        </p>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {uniqueLabels.map((label) => (
            <li key={label}>
              <button
                onClick={() => onLabelClick(label)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedLabel === label
                    ? 'bg-blue-50 ring-2 ring-blue-500 text-blue-800 font-medium'
                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                aria-pressed={selectedLabel === label}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
