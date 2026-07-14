'use client';

import { useEffect, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useSvgColors } from '@/hooks/useSvgColors';
import { rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';

interface FillInspectorProps {
  initialColor: RGBColor | null;
  svgEl: SVGElement | null;
  isSampling: boolean;
  sampledColor: RGBColor | null;
  onFillColorChange: (color: RGBColor) => void;
}

/** Paint / Pick live in the ToolBar nest — inspector owns color only. */
export function FillInspector({
  initialColor,
  svgEl,
  isSampling,
  sampledColor,
  onFillColorChange,
}: FillInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors } = useSvgColors(svgEl);
  const [fillColor, setFillColor] = useState<RGBColor>(
    initialColor ?? { r: 0, g: 0, b: 0 }
  );
  const fillHex = rgbToHex(fillColor);

  useEffect(() => {
    extractColors();
  }, [extractColors]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local picker buffer mirrors the shared Fill color
    setFillColor(initialColor ?? { r: 0, g: 0, b: 0 });
  }, [initialColor]);

  useEffect(() => {
    if (!svgEl) return;
    const observer = new MutationObserver(() => extractColors());
    observer.observe(svgEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ['fill', 'stroke'],
    });
    return () => observer.disconnect();
  }, [svgEl, extractColors]);

  const handleColorChange = (color: RGBColor) => {
    setFillColor(color);
    onFillColorChange(color);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.fill')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isSampling ? t('workspace.fillSampleHint') : t('workspace.fillHint')}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex items-center gap-3">
          <span
            className="h-12 w-12 shrink-0 rounded-md border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: fillHex }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('workspace.fillCurrentColor')}
            </p>
            <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
              {fillHex}
            </p>
          </div>
        </div>
        {sampledColor && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('workspace.fillSampledColor')} {rgbToHex(sampledColor)}
          </p>
        )}
      </div>

      <ColorSwatches colors={colors} selectedColor={fillColor} onColorClick={handleColorChange} />
      <ColorPicker color={fillColor} onChange={handleColorChange} />
    </div>
  );
}
