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
    <div className="space-y-3 rounded-lg border border-accent bg-accent-soft p-4 dark:border-dark-accent dark:bg-dark-accent-soft">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink dark:text-dark-ink">{t('labels.title')}</p>
        <p className="text-xs text-accent dark:text-dark-accent">{t('labels.editingHint')}</p>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('labels.placeholder')}
        maxLength={100}
        className="focus-ring w-full min-w-0 rounded-lg border border-border-strong px-3 py-2 text-sm dark:border-dark-border-strong dark:bg-dark-surface-sunken dark:text-dark-ink"
        aria-label={t('a11y.pathLabel')}
      />
      {classNamePreview ? (
        <div className="rounded-md border border-accent bg-surface/70 px-2.5 py-2 text-xs text-ink-muted dark:border-dark-accent dark:bg-dark-surface-sunken/60 dark:text-dark-ink-muted">
          <span className="font-medium">{t('labels.exportedAs')}</span>{' '}
          <code className="font-mono text-accent dark:text-dark-accent">data-label</code>
          <span aria-hidden> · </span>
          <code className="font-mono text-accent dark:text-dark-accent">.{classNamePreview}</code>
          <span aria-hidden> · </span>
          <code className="font-mono text-accent dark:text-dark-accent">&lt;g&gt;</code>
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
