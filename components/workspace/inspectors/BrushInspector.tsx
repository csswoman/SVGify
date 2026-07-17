'use client';

import { ColorPicker } from '@/components/colors/ColorPicker';
import { Tooltip } from '@/components/shared/Tooltip';
import { hexToRgb, rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import {
  inspectorLabel,
  inspectorRange,
  inspectorStack,
} from '@/components/workspace/inspectorChrome';

interface BrushInspectorProps {
  brushColor: string;
  brushSize: number;
  onBrushColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
}

export function BrushInspector({
  brushColor,
  brushSize,
  onBrushColorChange,
  onBrushSizeChange,
}: BrushInspectorProps) {
  const { t } = useI18n();
  const colorRgb = hexToRgb(brushColor) ?? { r: 0, g: 0, b: 0 };

  return (
    <div className={inspectorStack}>
      <InspectorHeader title={t('tool.brush')} subtitle={t('shape.brushSub')} />
      <div className="space-y-2">
        <p className="flex items-center text-sm font-semibold text-ink dark:text-dark-ink">
          {t('shape.brushColor')}
          <Tooltip text={t('shape.brush.help')} label={t('shape.modeBrush')} />
        </p>
        <ColorPicker
          color={colorRgb}
          onChange={(rgb) => onBrushColorChange(rgbToHex(rgb))}
        />
      </div>
      <div>
        <label className={inspectorLabel}>
          {t('shape.brushSize')}: <span className="ml-1 font-mono">{brushSize}</span>
        </label>
        <input
          type="range"
          min={1}
          max={40}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className={inspectorRange}
          aria-label={`${t('shape.brushSize')}: ${brushSize}`}
        />
      </div>
    </div>
  );
}
