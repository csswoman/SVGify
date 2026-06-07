'use client';

import { useEffect, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { hexToRgb, rgbToHex, isValidHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';

interface ColorPickerProps {
  color: RGBColor;
  onChange: (color: RGBColor) => void;
  onCommit?: () => void;
}

export function ColorPicker({ color, onChange, onCommit }: ColorPickerProps) {
  const { t } = useI18n();
  const [hexInput, setHexInput] = useState(rgbToHex(color));

  // Sync the editable hex input when the controlled color prop changes externally.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local edit buffer to controlled prop
    setHexInput(rgbToHex(color));
  }, [color]);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);
    const rgb = hexToRgb(hex);
    if (rgb) onChange(rgb);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);
    if (isValidHex(hex)) {
      const rgb = hexToRgb(hex);
      if (rgb) onChange(rgb);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('col.pickerLabel')}</p>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={hexInput.startsWith('#') ? hexInput : '#000000'}
          onChange={handleNativeChange}
          onBlur={onCommit}
          className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white"
          aria-label={t('col.pickerLabel')}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleTextChange}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit?.();
          }}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Hex color value"
        />
      </div>
      {!isValidHex(hexInput) && hexInput !== '' && (
        <p className="text-xs text-red-500">#ff0000</p>
      )}
    </div>
  );
}
