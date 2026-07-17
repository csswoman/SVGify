'use client';

import { LabelInfo } from '@/lib/labelUtils';
import { useI18n } from '@/lib/i18n';

interface LabelSidebarProps {
  labels: LabelInfo[];
  onLabelClick: (label: string) => void;
  selectedLabel: string | null;
}

export function LabelSidebar({ labels, onLabelClick, selectedLabel }: LabelSidebarProps) {
  const { t } = useI18n();
  const labelCounts = labels.reduce<Record<string, number>>((acc, item) => {
    acc[item.label] = (acc[item.label] ?? 0) + 1;
    return acc;
  }, {});
  const labelClassNames = labels.reduce<Record<string, string>>((acc, item) => {
    acc[item.label] = item.className;
    return acc;
  }, {});
  const uniqueLabels = Object.keys(labelCounts);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('labels.listTitle')} {uniqueLabels.length > 0 && `(${uniqueLabels.length})`}
      </p>
      {uniqueLabels.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('labels.empty')}
        </p>
      ) : (
        <ul className="scroll-quiet max-h-64 space-y-1 pr-1">
          {uniqueLabels.map((label) => (
            <li key={label}>
              <button
                onClick={() => onLabelClick(label)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedLabel === label
                    ? 'bg-blue-50 ring-2 ring-blue-500 text-blue-800 font-medium dark:bg-blue-950/50 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                aria-pressed={selectedLabel === label}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{label}</span>
                    <code className="block truncate font-mono text-[11px] font-normal text-gray-500 dark:text-gray-400">
                      .{labelClassNames[label]}
                    </code>
                  </span>
                  <span className="mt-0.5 shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {labelCounts[label]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
