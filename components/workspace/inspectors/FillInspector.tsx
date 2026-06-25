'use client';

import { useEffect, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useI18n } from '@/lib/i18n';

interface FillInspectorProps {
  initialColor: RGBColor | null;
  svgEl: SVGElement | null;
  onFillColorChange: (color: RGBColor) => void;
}

export function FillInspector({ initialColor, svgEl, onFillColorChange }: FillInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors } = useSvgColors(svgEl);
  const [fillColor, setFillColor] = useState<RGBColor>(
    initialColor ?? { r: 0, g: 0, b: 0 }
  );

  useEffect(() => {
    extractColors();
  }, [extractColors]);

  const handleColorChange = (color: RGBColor) => {
    setFillColor(color);
    onFillColorChange(color);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.fill')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('workspace.fillHint')}</p>
      </div>
      <ColorSwatches
        colors={colors}
        selectedColor={fillColor}
        onColorClick={handleColorChange}
      />
      <ColorPicker
        color={fillColor}
        onChange={handleColorChange}
      />
    </div>
  );
}
