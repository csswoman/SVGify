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

function isLightColor(color: RGBColor): boolean {
  // Relative luminance (sRGB approx) — light chips need a visible edge on white surfaces.
  const y = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return y > 0.82;
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
    return (
      <p className="text-xs text-ink-muted dark:text-dark-ink-muted">{t('col.noColors')}</p>
    );
  }

  return (
    <div className="space-y-2">
      {showTitle ? (
        <p className="text-xs font-semibold text-ink dark:text-dark-ink">
          {t('col.paletteTitle')}{' '}
          <span className="font-mono font-normal text-ink-muted dark:text-dark-ink-muted">
            ({colors.length})
          </span>
        </p>
      ) : null}

      {pendingDeleteHex && onColorDelete ? (
        <div
          role="group"
          aria-label={t('col.deleteColor')}
          className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="text-xs text-amber-950 dark:text-amber-100">{t('col.deleteColor.prompt')}</p>
          <p className="font-mono text-[11px] text-amber-900 dark:text-amber-200">{pendingDeleteHex}</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                const target = colors.find((c) => rgbToHex(c) === pendingDeleteHex);
                if (target) onColorDelete(target);
                setPendingDeleteHex(null);
              }}
              className="focus-ring rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-canvas-bg dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
            >
              {t('col.deleteColor.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteHex(null)}
              className="focus-ring rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:text-ink dark:text-dark-ink-muted"
            >
              {t('col.deleteColor.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Padding keeps selection rings inside the overflow clip; gap gives the chips room to breathe. */}
      <div className="scroll-quiet grid max-h-48 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2.5 p-1.5">
        {colors.map((color, idx) => {
          const hex = rgbToHex(color);
          const isSelected =
            selectedColor !== null && rgbToHex(selectedColor) === hex;
          const light = isLightColor(color);

          return (
            <div key={`${hex}-${idx}`} className="group relative p-0.5">
              <button
                type="button"
                onClick={() => onColorClick(color)}
                title={hex}
                className={[
                  'focus-ring relative aspect-square w-full rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]',
                  isSelected
                    ? 'ring-2 ring-action-blue ring-offset-2 ring-offset-surface dark:ring-offset-dark-surface'
                    : 'hover:ring-2 hover:ring-ink-subtle/50 hover:ring-offset-2 hover:ring-offset-surface dark:hover:ring-dark-ink-muted/50 dark:hover:ring-offset-dark-surface',
                ].join(' ')}
                style={{ backgroundColor: hex }}
                aria-label={`${t('col.selectColor')} ${hex}`}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <span
                    className={[
                      'pointer-events-none absolute inset-0 flex items-center justify-center',
                      light ? 'text-ink' : 'text-white',
                    ].join(' ')}
                  >
                    <Check size={14} weight="bold" aria-hidden />
                  </span>
                ) : null}
              </button>
              {onColorDelete && colors.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setPendingDeleteHex(hex)}
                  className="focus-ring absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-surface/90 text-ink-muted opacity-0 backdrop-blur-sm transition hover:text-red-700 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-dark-surface/90 dark:text-dark-ink-muted dark:hover:text-red-300"
                  aria-label={`${t('col.deleteColor')} ${hex}`}
                  title={t('col.deleteColor')}
                >
                  <Trash size={10} weight="bold" aria-hidden />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
