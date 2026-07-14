'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface LabelInputProps {
  currentLabel?: string | null;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function LabelInput({ currentLabel, onSave, onCancel }: LabelInputProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(currentLabel ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('labels.title')}</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('labels.placeholder')}
        maxLength={100}
        className="focus-ring w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        aria-label={t('a11y.pathLabel')}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSave}
          disabled={!value.trim()}
          className="btn-secondary flex-1"
        >
          {t('labels.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-tertiary flex-1"
        >
          {t('labels.cancel')}
        </button>
      </div>
    </div>
  );
}
