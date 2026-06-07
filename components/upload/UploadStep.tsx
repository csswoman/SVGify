'use client';

import { useState } from 'react';
import { ImageDropzone } from './ImageDropzone';
import { useI18n } from '@/lib/i18n';

interface UploadStepProps {
  onUploadComplete: (imageData: ImageData) => void;
}

export function UploadStep({ onUploadComplete }: UploadStepProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t('upload.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('upload.subtitle')}</p>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <ImageDropzone
        onImageData={(imageData) => {
          setError(null);
          onUploadComplete(imageData);
        }}
        onError={setError}
      />

      <p className="text-xs text-center text-gray-400 dark:text-gray-500">{t('upload.privacy')}</p>
    </div>
  );
}
