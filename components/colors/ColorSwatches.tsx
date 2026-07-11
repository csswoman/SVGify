'use client';

import { useState } from 'react';
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
  /** When false, omit the “Palette (N)” heading (parent already labels the section). */
  showTitle?: boolean;
}

export function ColorSwatches({
  colors,
  onColorClick,
  selectedColor,
  onColorDelete,
  showTitle = true,
}: ColorSwatchesProps) {
  const { t } = useI18n();
  const [pendingDeleteHex, setPendingDeleteHex] = useState<string | null>(null);

  if (colors.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('col.noColors')}</p>;
  }

  return (
    <div className="space-y-2">
      {showTitle && (
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('col.paletteTitle')} ({colors.length} {t('vec.colors')})
        </p>
      )}
      {pendingDeleteHex && onColorDelete && (
        <div
          role="group"
          aria-label={t('col.deleteColor')}
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="text-xs text-amber-950 dark:text-amber-100">{t('col.deleteColor.prompt')}</p>
          <p className="font-mono text-[11px] text-amber-900 dark:text-amber-200">{pendingDeleteHex}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const target = colors.find((c) => rgbToHex(c) === pendingDeleteHex);
                if (target) onColorDelete(target);
                setPendingDeleteHex(null);
              }}
              className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {t('col.deleteColor.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteHex(null)}
              className="focus-ring rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-white/60 dark:text-gray-300"
            >
              {t('col.deleteColor.cancel')}
            </button>
          </div>
        </div>
      )}
      <div className="max-h-[280px] overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
          {colors.map((color, idx) => {
            const hex = rgbToHex(color);
            const isSelected =
              selectedColor !== null && rgbToHex(selectedColor) === hex;

            return (
              <div key={`${hex}-${idx}`} className="group relative min-w-0">
                <button
                  type="button"
                  onClick={() => onColorClick(color)}
                  className="focus-ring flex w-full flex-col items-stretch gap-1 text-left transition"
                  aria-label={`${t('col.selectColor')} ${hex}`}
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
                  <span className="truncate font-mono text-[10px] text-gray-500 opacity-0 transition group-hover:opacity-100 dark:text-gray-400">
                    {hex}
                  </span>
                  {isSelected && (
                    <span className="pointer-events-none absolute bottom-5 left-1 flex size-4 items-center justify-center rounded-sm bg-white/90 text-blue-700 dark:bg-gray-900/90 dark:text-blue-300">
                      <Check size={10} weight="bold" aria-hidden />
                    </span>
                  )}
                </button>
                {onColorDelete && colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteHex(hex)}
                    className="focus-ring absolute right-0.5 top-0.5 rounded-md bg-white/90 p-1 text-gray-500 opacity-0 shadow-sm transition hover:text-red-700 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:text-red-300"
                    aria-label={`${t('col.deleteColor')} ${hex}`}
                    title={t('col.deleteColor')}
                  >
                    <Trash size={12} weight="bold" aria-hidden />
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
