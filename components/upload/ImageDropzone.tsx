'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { validateFile, fileToImageData } from '@/lib/fileUtils';
import { useI18n, type TKey } from '@/lib/i18n';

interface ImageDropzoneProps {
  onImageData: (imageData: ImageData) => void;
  onError: (error: string) => void;
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

export function ImageDropzone({ onImageData, onError }: ImageDropzoneProps) {
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
        'focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-800',
        'flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors',
        isLoading ? 'pointer-events-none opacity-70' : '',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-gray-500',
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
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
        {isLoading ? t('upload.busy') : t('upload.drop')}
      </p>
      <p className="mt-2 max-w-sm text-xs text-gray-500 dark:text-gray-400">{t('upload.formats')}</p>
    </label>
  );
}
