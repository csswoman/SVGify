'use client';

import { useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { useI18n } from '@/lib/i18n';

interface FillInspectorProps {
  initialColor: RGBColor | null;
  onFillColorChange: (color: RGBColor) => void;
}

export function FillInspector({ initialColor, onFillColorChange }: FillInspectorProps) {
  const { t } = useI18n();
  const [fillColor, setFillColor] = useState<RGBColor>(
    initialColor ?? { r: 0, g: 0, b: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.fill')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('workspace.fillHint')}</p>
      </div>
      <ColorPicker
        color={fillColor}
        onChange={(color) => {
          setFillColor(color);
          onFillColorChange(color);
        }}
      />
    </div>
  );
}
