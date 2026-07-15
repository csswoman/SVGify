'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { labelToClassName } from '@/lib/labelUtils';

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
  const classNamePreview = value.trim() ? labelToClassName(value) : null;

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('labels.title')}</p>
        <p className="text-xs text-blue-800 dark:text-blue-200">{t('labels.editingHint')}</p>
      </div>
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
      {classNamePreview ? (
        <div className="rounded-md border border-blue-200 bg-white/70 px-2.5 py-2 text-xs text-gray-700 dark:border-blue-900 dark:bg-gray-900/60 dark:text-gray-300">
          <span className="font-medium">{t('labels.exportedAs')}</span>{' '}
          <code className="font-mono text-blue-700 dark:text-blue-300">data-label</code>
          <span aria-hidden> · </span>
          <code className="font-mono text-blue-700 dark:text-blue-300">.{classNamePreview}</code>
          <span aria-hidden> · </span>
          <code className="font-mono text-blue-700 dark:text-blue-300">&lt;g&gt;</code>
        </div>
      ) : null}
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
