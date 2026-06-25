'use client';

import { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';

interface ColorSwatchesProps {
  colors: RGBColor[];
  onColorClick: (color: RGBColor) => void;
  selectedColor: RGBColor | null;
  /** Delete a color (its regions get reassigned to the nearest remaining color). */
  onColorDelete?: (color: RGBColor) => void;
}

export function ColorSwatches({
  colors,
  onColorClick,
  selectedColor,
  onColorDelete,
}: ColorSwatchesProps) {
  const { t } = useI18n();
  if (colors.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">{t('col.noColors')}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('col.paletteTitle')} ({colors.length} {t('vec.colors')})
      </p>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {colors.map((color, idx) => {
          const hex = rgbToHex(color);
          const isSelected =
            selectedColor !== null && rgbToHex(selectedColor) === hex;

          return (
            <div
              key={idx}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isSelected ? 'bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-950/50' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <button
                onClick={() => onColorClick(color)}
                className="flex items-center gap-3 flex-1 min-w-0"
                aria-label={`Select color ${hex}`}
                aria-pressed={isSelected}
              >
                <span
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-mono text-gray-700 dark:text-gray-300">{hex}</span>
              </button>
              {onColorDelete && colors.length > 1 && (
                <button
                  onClick={() => onColorDelete(color)}
                  className="focus-ring shrink-0 rounded p-1 text-gray-600 transition hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  aria-label={`${t('col.deleteColor')} ${hex}`}
                  title={t('col.deleteColor')}
                >
                  🗑
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
