'use client';

import { useMemo } from 'react';
import { extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';

interface PalettePreviewProps {
  /** The current SVG string; its fill colors are shown as swatches. */
  svg: string | null;
}

/**
 * Shows the actual color palette of the current vector result. Updates
 * automatically as the SVG re-vectorizes, so the user sees how many (and which)
 * colors the chosen settings produce.
 */
export function PalettePreview({ svg }: PalettePreviewProps) {
  const { t } = useI18n();
  const palette = useMemo(() => (svg ? extractPaletteFromSvgString(svg) : []), [svg]);

  if (palette.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
        {t('vec.palette')}
        <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
          {palette.length} {palette.length === 1 ? t('vec.color') : t('vec.colors')}
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {palette.map((c) => {
          const hex = rgbToHex(c);
          return (
            <span
              key={hex}
              title={hex}
              className="h-7 w-7 rounded border border-gray-200 dark:border-gray-700 shadow-sm"
              style={{ backgroundColor: hex }}
              aria-label={`Color ${hex}`}
            />
          );
        })}
      </div>
    </div>
  );
}
