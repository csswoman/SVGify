'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface SelectInspectorProps {
  svgEl: SVGElement | null;
  svgString: string;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onPushSnapshot: () => void;
}

export function SelectInspector({
  svgEl,
  svgString,
  selectedColor,
  onSelectedColorChange,
  onPushSnapshot,
}: SelectInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors, replaceColor, deleteColor, snapDarksToBlack, normalizePalette } =
    useSvgColors(svgEl);
  const [targetCount, setTargetCount] = useState(6);
  const [originalPalette, setOriginalPalette] = useState<RGBColor[]>([]);
  const [showOriginalPalette, setShowOriginalPalette] = useState(false);

  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  useEffect(() => {
    setOriginalPalette(extractPaletteFromSvgString(svgString));
  }, [svgString]);

  const handleColorPickerChange = useCallback(
    (newColor: RGBColor) => {
      if (!selectedColor) return;
      replaceColor(selectedColor, newColor);
      onSelectedColorChange(newColor);
      onPushSnapshot();
    },
    [selectedColor, replaceColor, onSelectedColorChange, onPushSnapshot]
  );

  const handleReapplyOriginal = useCallback(
    (color: RGBColor) => {
      if (selectedColor && rgbToHex(selectedColor) !== rgbToHex(color)) {
        replaceColor(selectedColor, color);
        onSelectedColorChange(color);
        onPushSnapshot();
      } else {
        onSelectedColorChange(color);
      }
    },
    [selectedColor, replaceColor, onSelectedColorChange, onPushSnapshot]
  );

  const handleDeleteColor = useCallback(
    (color: RGBColor) => {
      deleteColor(color);
      if (selectedColor && rgbToHex(selectedColor) === rgbToHex(color)) {
        onSelectedColorChange(null);
      }
      onPushSnapshot();
    },
    [deleteColor, selectedColor, onSelectedColorChange, onPushSnapshot]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('col.title')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('col.subtitle')}</p>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
        <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('col.reduce')}: <span className="ml-1 font-mono">{targetCount}</span>
          <Tooltip text={t('col.reduce.help')} label={t('col.reduce')} />
        </label>
        <input
          type="range"
          min={2}
          max={Math.max(2, Math.min(12, colors.length))}
          value={Math.min(targetCount, Math.max(2, Math.min(12, colors.length)))}
          onChange={(e) => setTargetCount(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <button
          type="button"
          onClick={() => {
            normalizePalette(targetCount);
            onPushSnapshot();
          }}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {t('col.normalize')}
          <Tooltip text={t('col.normalize.help')} label={t('col.normalize')} />
        </button>
        <button
          type="button"
          onClick={() => {
            snapDarksToBlack(72);
            onPushSnapshot();
          }}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          {t('col.snapBlackBtn')}
          <Tooltip text={t('col.snapBlack.help')} label={t('col.snapBlack')} />
        </button>
      </div>

      <ColorSwatches
        colors={colors}
        onColorClick={onSelectedColorChange}
        selectedColor={selectedColor}
        onColorDelete={handleDeleteColor}
      />

      {originalPalette.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowOriginalPalette((v) => !v)}
            className="flex w-full items-center text-xs font-semibold uppercase tracking-wide text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <span className="mr-1">{showOriginalPalette ? '▾' : '▸'}</span>
            {t('col.originalColors')}
          </button>
          {showOriginalPalette && (
            <div className="flex flex-wrap gap-1.5">
              {originalPalette.map((c) => {
                const hex = rgbToHex(c);
                return (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    onClick={() => handleReapplyOriginal(c)}
                    className="h-7 w-7 rounded border border-gray-200 shadow-sm transition hover:ring-2 hover:ring-blue-400 dark:border-gray-700"
                    style={{ backgroundColor: hex }}
                    aria-label={`Reapply original color ${hex}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedColor && (
        <ColorPicker
          color={selectedColor}
          onChange={handleColorPickerChange}
          onCommit={onPushSnapshot}
        />
      )}
    </div>
  );
}
