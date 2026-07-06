'use client';

import type { LabelInfo } from '@/lib/labelUtils';
import { LabelSidebar } from '@/components/labels/LabelSidebar';
import { LabelInput } from '@/components/labels/LabelInput';
import { useI18n } from '@/lib/i18n';

interface LabelsInspectorProps {
  labels: LabelInfo[];
  editingPath: SVGPathElement | null;
  selectedLabel: string | null;
  onLabelSave: (label: string) => void;
  onLabelClick: (label: string) => void;
  onCancelEdit: () => void;
}

export function LabelsInspector({
  labels,
  editingPath,
  selectedLabel,
  onLabelSave,
  onLabelClick,
  onCancelEdit,
}: LabelsInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.labels')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('workspace.labelsHint')}</p>
      </div>
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
