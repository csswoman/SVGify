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
          <p className="text-pretty text-xs text-amber-950 dark:text-amber-100">
            {t('vec.paletteReset.confirm')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className="btn-tertiary flex-1"
            >
              {t('vec.paletteReset.confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="focus-ring min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-900/40"
            >
              {t('vec.paletteReset.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onMergeSimilar} className="btn-tertiary w-full">
            {t('vec.paletteMerge')}
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className="btn-tertiary w-full">
            {t('vec.paletteReset')}
          </button>
        </div>
      )}
    </div>
  );
}
