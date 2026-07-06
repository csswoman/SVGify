'use client';

import { Check, Trash } from '@phosphor-icons/react';
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
      <div className="max-h-[280px] overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
          {colors.map((color, idx) => {
            const hex = rgbToHex(color);
            const isSelected =
              selectedColor !== null && rgbToHex(selectedColor) === hex;

            return (
              <div key={idx} className="group relative">
                <button
                  type="button"
                  onClick={() => onColorClick(color)}
                  className="focus-ring flex w-full flex-col items-stretch gap-1 text-left transition"
                  aria-label={`Select color ${hex}`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={[
                      'aspect-square w-full rounded-md transition',
                      'group-hover:ring-1 group-hover:ring-gray-300 dark:group-hover:ring-gray-600',
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                        : '',
                    ].join(' ')}
                    style={{ backgroundColor: hex }}
                  />
                  <span className="truncate font-mono text-[10px] text-gray-400 opacity-0 transition group-hover:opacity-100 dark:text-gray-500">
                    {hex}
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      weight="bold"
                      className="absolute right-2 top-2 text-blue-700 dark:text-blue-300"
                      aria-hidden
                    />
                  )}
                </button>
                {onColorDelete && colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onColorDelete(color)}
                    className="focus-ring absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-gray-500 opacity-0 shadow-sm transition hover:text-red-600 group-hover:opacity-100 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:text-red-400"
                    aria-label={`${t('col.deleteColor')} ${hex}`}
                    title={t('col.deleteColor')}
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
