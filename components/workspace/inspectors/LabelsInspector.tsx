'use client';

import type { LabelInfo } from '@/lib/labelUtils';
import { LabelSidebar } from '@/components/labels/LabelSidebar';
import { LabelInput } from '@/components/labels/LabelInput';
import { useI18n } from '@/lib/i18n';

interface LabelsInspectorProps {
  labels: LabelInfo[];
  editingPath: SVGPathElement | null;
  selectedLabel: string | null;
  includeLabelLegend: boolean;
  onLabelSave: (label: string) => void;
  onLabelClick: (label: string) => void;
  onCancelEdit: () => void;
  onIncludeLabelLegendChange: (value: boolean) => void;
}

export function LabelsInspector({
  labels,
  editingPath,
  selectedLabel,
  includeLabelLegend,
  onLabelSave,
  onLabelClick,
  onCancelEdit,
  onIncludeLabelLegendChange,
}: LabelsInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.labels')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('workspace.labelsHint')}</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        {t('labels.exportHelp')}
      </div>
      {labels.length > 0 ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          <input
            type="checkbox"
            checked={includeLabelLegend}
            onChange={(event) => onIncludeLabelLegendChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-blue-600"
          />
          <span className="space-y-1">
            <span className="block font-medium">{t('workspace.labelLegend')}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {t('workspace.labelLegendHint')}
            </span>
          </span>
        </label>
      ) : null}
      {editingPath ? (
        <LabelInput
          currentLabel={editingPath.getAttribute('data-label')}
          onSave={onLabelSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <LabelSidebar labels={labels} onLabelClick={onLabelClick} selectedLabel={selectedLabel} />
      )}
    </div>
  );
}
