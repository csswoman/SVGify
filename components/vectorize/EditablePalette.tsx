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

const quietBtn =
  'focus-ring inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-border px-2.5 text-xs font-medium text-ink-muted transition hover:bg-canvas-bg hover:text-ink dark:border-dark-border dark:text-dark-ink-muted dark:hover:bg-dark-canvas-bg dark:hover:text-dark-ink';

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
        showTitle={false}
      />

      {selectedColor ? (
        <ColorPicker
          color={selectedColor}
          onChange={onChangeSelectedColor}
          onCommit={() => onAddColor(selectedColor)}
          actionLabel={t('workspace.fillAddToPalette')}
        />
      ) : null}

      {confirmReset ? (
        <div
          role="group"
          aria-label={t('vec.paletteReset')}
          className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <p className="text-pretty text-xs text-amber-950 dark:text-amber-100">
            {t('vec.paletteReset.confirm')}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
              className={quietBtn}
            >
              {t('vec.paletteReset.confirmAction')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="focus-ring inline-flex min-h-9 flex-1 items-center justify-center rounded-md px-2.5 text-xs font-medium text-ink-muted transition hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink"
            >
              {t('vec.paletteReset.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button type="button" onClick={onMergeSimilar} className={quietBtn}>
            {t('vec.paletteMerge')}
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className={quietBtn}>
            {t('vec.paletteReset')}
          </button>
        </div>
      )}
    </div>
  );
}
