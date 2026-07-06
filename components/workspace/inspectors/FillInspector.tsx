'use client';

import { useEffect, useState } from 'react';
import { Eyedropper, PaintBucket } from '@phosphor-icons/react';
import type { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useSvgColors } from '@/hooks/useSvgColors';
import { rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';

interface FillInspectorProps {
  initialColor: RGBColor | null;
  svgEl: SVGElement | null;
  isSampling: boolean;
  sampledColor: RGBColor | null;
  onFillColorChange: (color: RGBColor) => void;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function FillInspector({
  initialColor,
  svgEl,
  isSampling,
  sampledColor,
  onFillColorChange,
  onToolChange,
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
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('workspace.fillHint')}</p>
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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onToolChange('fill')}
          className={[
            'focus-ring flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition',
            !isSampling
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
          ].join(' ')}
          aria-pressed={!isSampling}
        >
          <PaintBucket size={16} weight={!isSampling ? 'fill' : 'regular'} aria-hidden />
          {t('workspace.fillPaintMode')}
        </button>
        <button
          type="button"
          onClick={() => onToolChange('eyedropper')}
          className={[
            'focus-ring flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition',
            isSampling
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
          ].join(' ')}
          aria-pressed={isSampling}
        >
          <Eyedropper size={16} weight={isSampling ? 'fill' : 'regular'} aria-hidden />
          {t('workspace.fillSampleMode')}
        </button>
      </div>

      {isSampling && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
          {t('workspace.fillSampleHint')}
        </p>
      )}

      <ColorSwatches colors={colors} selectedColor={fillColor} onColorClick={handleColorChange} />
      <ColorPicker
        color={fillColor}
        onChange={handleColorChange}
      />
    </div>
  );
}
