'use client';

import { useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useI18n } from '@/lib/i18n';

interface EditablePaletteProps {
  colors: RGBColor[];
  selectedColor: RGBColor | null;
  onSelectColor: (color: RGBColor) => void;
  onAddColor: (color: RGBColor) => void;
  onChangeSelectedColor: (color: RGBColor) => void;
  onDeleteColor: (color: RGBColor) => void;
  onMergeSimilar: () => void;
  onReset: () => void;
}

export function EditablePalette({
  colors,
  selectedColor,
  onSelectColor,
  onAddColor,
  onChangeSelectedColor,
  onDeleteColor,
  onMergeSimilar,
  onReset,
}: EditablePaletteProps) {
  const { t } = useI18n();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('vec.palettePreviewHint')}</p>

      <ColorSwatches
        colors={colors}
        selectedColor={selectedColor}
        onColorClick={onSelectColor}
        onColorDelete={onDeleteColor}
      />

      {selectedColor && (
        <ColorPicker
          color={selectedColor}
          onChange={onChangeSelectedColor}
          onCommit={() => onAddColor(selectedColor)}
          actionLabel={t('workspace.fillAddToPalette')}
        />
      )}

      {confirmReset ? (
        <div
          role="group"
          aria-label={t('vec.paletteReset')}
          className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="text-xs text-amber-950 dark:text-amber-100">{t('vec.paletteReset.confirm')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className="focus-ring rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {t('vec.paletteReset.confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="focus-ring rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-white/60 dark:text-gray-300"
            >
              {t('vec.paletteReset.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMergeSimilar}
            className="focus-ring rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {t('vec.paletteMerge')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="focus-ring rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {t('vec.paletteReset')}
          </button>
        </div>
      )}
    </div>
  );
}
