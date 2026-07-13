'use client';

import type { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';

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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.eyedropper')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('col.eyedropperHint')}</p>
      </div>

      {selectedColor ? (
        <>
          <div
            className="h-10 w-full rounded border border-gray-200 dark:border-gray-700"
            style={{ backgroundColor: rgbToHex(selectedColor) }}
          />
          <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{rgbToHex(selectedColor)}</p>
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
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('col.eyedropperEmpty')}</p>
      )}
    </div>
  );
}
