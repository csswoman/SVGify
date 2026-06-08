'use client';

import { RGBColor } from '@/types/svg.types';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { useI18n } from '@/lib/i18n';

interface EditablePaletteProps {
  colors: RGBColor[];
  selectedColor: RGBColor | null;
  onSelectColor: (color: RGBColor) => void;
  onChangeSelectedColor: (color: RGBColor) => void;
  onDeleteColor: (color: RGBColor) => void;
  onMergeSimilar: () => void;
  onReset: () => void;
}

export function EditablePalette({
  colors,
  selectedColor,
  onSelectColor,
  onChangeSelectedColor,
  onDeleteColor,
  onMergeSimilar,
  onReset,
}: EditablePaletteProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {t('vec.paletteEditor')}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('vec.paletteEditor.help')}
        </p>
      </div>

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
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMergeSimilar}
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {t('vec.paletteMerge')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {t('vec.paletteReset')}
        </button>
      </div>
    </div>
  );
}
