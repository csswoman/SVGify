'use client';

import { useCallback, useState } from 'react';
import { validateFile, fileToImageData } from '@/lib/fileUtils';
import { useI18n } from '@/lib/i18n';

interface ImageDropzoneProps {
  onImageData: (imageData: ImageData) => void;
  onError: (error: string) => void;
}

export function ImageDropzone({ onImageData, onError }: ImageDropzoneProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);

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
      aria-label="Image upload area"
      onDragEnter={() => setIsDragging(true)}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-4 border-dashed rounded-xl p-16 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500'
      }`}
    >
      <div className="text-5xl mb-4 select-none">🖼️</div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('upload.drop')}</h2>
      <label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleInputChange}
          className="sr-only"
          aria-label={t('upload.drop')}
        />
        <span className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
          {t('upload.title')}
        </span>
      </label>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-6">{t('upload.formats')}</p>
    </div>
  );
}
