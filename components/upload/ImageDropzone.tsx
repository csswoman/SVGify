'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { validateFile, fileToImageData } from '@/lib/fileUtils';
import { useI18n, type TKey } from '@/lib/i18n';

interface ImageDropzoneProps {
  onImageData: (imageData: ImageData) => void;
  onError: (error: string) => void;
  compact?: boolean;
}

const UPLOAD_ERROR_KEYS: Record<string, TKey> = {
  INVALID_MIME: 'upload.error.INVALID_MIME',
  INVALID_MAGIC: 'upload.error.INVALID_MAGIC',
  FILE_TOO_LARGE: 'upload.error.FILE_TOO_LARGE',
  INVALID_DIMENSIONS: 'upload.error.INVALID_DIMENSIONS',
  LOAD_FAILED: 'upload.error.LOAD_FAILED',
  READ_FAILED: 'upload.error.READ_FAILED',
  NO_CONTEXT: 'upload.error.NO_CONTEXT',
};

function messageForCode(code: string | undefined, t: (key: TKey) => string): string {
  if (code && code in UPLOAD_ERROR_KEYS) {
    return t(UPLOAD_ERROR_KEYS[code]);
  }
  return t('upload.error.UNKNOWN');
}

export function ImageDropzone({ onImageData, onError, compact = false }: ImageDropzoneProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = useCallback(
    async (file: File) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const validation = await validateFile(file);
        if (!validation.ok && validation.error) {
          onError(messageForCode(validation.error.code, t));
          return;
        }
        const imageData = await fileToImageData(file);
        onImageData(imageData);
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as Error & { code?: string }).code)
            : undefined;
        onError(messageForCode(code, t));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, onImageData, onError, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (isLoading) return;
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    },
    [handleFile, isLoading]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) handleFile(files[0]);
      e.currentTarget.value = '';
    },
    [handleFile]
  );

  return (
    <label
      htmlFor={inputId}
      onDragEnter={() => !isLoading && setIsDragging(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      aria-busy={isLoading}
      className={[
        'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 dark:focus-within:ring-offset-dark-surface',
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors',
        compact ? 'min-h-32 gap-1.5 p-5' : 'min-h-44 p-10',
        isLoading ? 'pointer-events-none opacity-70' : '',
        isDragging
          ? 'border-accent bg-accent-soft dark:bg-dark-accent-soft/40'
          : 'transparent-preview border-border-strong hover:border-ink-subtle dark:border-dark-border-strong dark:hover:border-dark-ink-subtle',
      ].join(' ')}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        disabled={isLoading}
        className="sr-only"
      />
      <p className={compact ? 'text-xs font-semibold text-ink dark:text-dark-ink' : 'text-sm font-medium text-ink dark:text-dark-ink'}>
        {isLoading ? t('upload.busy') : compact ? t('upload.replaceDrop') : t('upload.drop')}
      </p>
      <p className={compact ? 'max-w-sm font-mono text-[11px] text-ink-muted dark:text-dark-ink-muted' : 'mt-2 max-w-sm font-mono text-xs text-ink-muted dark:text-dark-ink-muted'}>{t('upload.formats')}</p>
    </label>
  );
}
