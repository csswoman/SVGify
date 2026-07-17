'use client';

import type { LabelInfo } from '@/lib/labelUtils';
import { LabelSidebar } from '@/components/labels/LabelSidebar';
import { LabelInput } from '@/components/labels/LabelInput';
import { useI18n } from '@/lib/i18n';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import {
  inspectorCheckbox,
  inspectorHint,
  inspectorSection,
  inspectorStack,
} from '@/components/workspace/inspectorChrome';

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
    <div className={inspectorStack}>
      <InspectorHeader title={t('tool.labels')} subtitle={t('workspace.labelsHint')} />
      <p className={inspectorHint}>{t('labels.exportHelp')}</p>
      {labels.length > 0 ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink dark:text-dark-ink">
          <input
            type="checkbox"
            checked={includeLabelLegend}
            onChange={(event) => onIncludeLabelLegendChange(event.target.checked)}
            className={`mt-0.5 ${inspectorCheckbox}`}
          />
          <span className="space-y-1">
            <span className="block font-medium">{t('workspace.labelLegend')}</span>
            <span className={inspectorHint}>{t('workspace.labelLegendHint')}</span>
          </span>
        </label>
      ) : null}
      <div className={inspectorSection}>
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
    </div>
  );
}
