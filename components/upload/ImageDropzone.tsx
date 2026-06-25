'use client';

import { useCallback, useRef, useState } from 'react';
import { validateFile, fileToImageData } from '@/lib/fileUtils';
import { useI18n } from '@/lib/i18n';

interface ImageDropzoneProps {
  onImageData: (imageData: ImageData) => void;
  onError: (error: string) => void;
}

export function ImageDropzone({ onImageData, onError }: ImageDropzoneProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const validation = await validateFile(file);
        if (!validation.ok && validation.error) {
          onError(validation.error.message);
          return;
        }
        const imageData = await fileToImageData(file);
        onImageData(imageData);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to load image');
      }
    },
    [onImageData, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) handleFile(files[0]);
    },
    [handleFile]
  );

  return (
    <div
      role="region"
      aria-label={t('upload.drop')}
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      tabIndex={0}
      className={[
        'cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('upload.drop')}</p>
    </div>
  );
}
