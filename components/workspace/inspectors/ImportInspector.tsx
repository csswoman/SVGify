'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ImageDropzone } from '@/components/upload/ImageDropzone';

interface ImportInspectorProps {
  onReplace: (imageData: ImageData) => void;
  onError: (error: string) => void;
  uploadError: string | null;
}

/** Replace-image controls — only shown after a document is loaded. */
export function ImportInspector({ onReplace, onError, uploadError }: ImportInspectorProps) {
  const { t } = useI18n();
  const [confirmReplace, setConfirmReplace] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('workspace.replaceImage')}
        </h2>
        <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">
          {t('workspace.importReplaceHint')}
        </p>
      </div>
      {uploadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {uploadError}
        </p>
      )}
      {confirmReplace ? (
        <div
          role="group"
          aria-label={t('workspace.replaceImage')}
          className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30"
        >
          <p className="text-pretty text-xs text-blue-950 dark:text-blue-100">
            {t('workspace.replaceImage.confirm')}
          </p>
          <ImageDropzone
            compact
            onImageData={(imageData) => {
              setConfirmReplace(false);
              onReplace(imageData);
            }}
            onError={onError}
          />
          <button
            type="button"
            onClick={() => setConfirmReplace(false)}
            className="w-full py-1.5 text-xs font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-300"
          >
            {t('workspace.replaceImage.cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmReplace(true)}
          className="btn-tertiary w-full"
        >
          {t('workspace.replaceImage')}
        </button>
      )}
    </div>
  );
}
