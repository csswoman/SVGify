'use client';

import type { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import { inspectorHint, inspectorStack } from '@/components/workspace/inspectorChrome';

interface EyedropperInspectorProps {
  svgEl: SVGElement | null;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onPushSnapshot: () => void;
}

export function EyedropperInspector({
  svgEl,
  selectedColor,
  onSelectedColorChange,
  onFillColorChange,
  onToolChange,
  onPushSnapshot,
}: EyedropperInspectorProps) {
  const { t } = useI18n();
  const { replaceColor } = useSvgColors(svgEl);

  return (
    <div className={inspectorStack}>
      <InspectorHeader title={t('tool.eyedropper')} subtitle={t('col.eyedropperHint')} />

      {selectedColor ? (
        <>
          <div
            className="h-10 w-full rounded border border-border dark:border-dark-border"
            style={{ backgroundColor: rgbToHex(selectedColor) }}
          />
          <p className="font-mono text-xs text-ink-muted dark:text-dark-ink-muted">
            {rgbToHex(selectedColor)}
          </p>
          <ColorPicker
            color={selectedColor}
            onChange={(newColor) => {
              if (!selectedColor) return;
              replaceColor(selectedColor, newColor);
              onSelectedColorChange(newColor);
              onPushSnapshot();
            }}
            onCommit={onPushSnapshot}
          />
          <button
            type="button"
            onClick={() => {
              onFillColorChange(selectedColor);
              onToolChange('fill');
            }}
            className="btn-secondary w-full"
          >
            {t('col.useAsFill')}
          </button>
        </>
      ) : (
        <p className={inspectorHint}>{t('col.eyedropperEmpty')}</p>
      )}
    </div>
  );
}
