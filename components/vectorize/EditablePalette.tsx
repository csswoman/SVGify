'use client';

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

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('vec.palettePreviewHint')}
      </p>

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

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onMergeSimilar}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {t('vec.paletteMerge')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {t('vec.paletteReset')}
        </button>
      </div>
    </div>
  );
}
