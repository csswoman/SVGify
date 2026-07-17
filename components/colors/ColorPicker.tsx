'use client';

import { useEffect, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { hexToRgb, rgbToHex, isValidHex } from '@/lib/colorUtils';
import { useI18n } from '@/lib/i18n';

interface ColorPickerProps {
  color: RGBColor;
  onChange: (color: RGBColor) => void;
  onCommit?: () => void;
  actionLabel?: string;
}

export function ColorPicker({ color, onChange, onCommit, actionLabel }: ColorPickerProps) {
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

  const fieldClass =
    'h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 font-mono text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-action-blue dark:border-dark-border dark:bg-dark-canvas-bg dark:text-dark-ink';

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-ink dark:text-dark-ink">{t('col.pickerLabel')}</p>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={hexInput.startsWith('#') ? hexInput : '#000000'}
          onChange={handleNativeChange}
          onBlur={onCommit}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-surface p-0.5 dark:border-dark-border dark:bg-dark-surface"
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
          spellCheck={false}
          className={fieldClass}
          aria-label={t('a11y.hexColor')}
        />
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={() => onCommit?.()}
          className="btn-secondary-sm w-full"
        >
          {actionLabel}
        </button>
      ) : null}
      {!isValidHex(hexInput) && hexInput !== '' ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t('col.invalidHex')}
        </p>
      ) : null}
    </div>
  );
}
