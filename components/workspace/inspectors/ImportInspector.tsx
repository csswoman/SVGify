'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ImageDropzone } from '@/components/upload/ImageDropzone';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import { inspectorStack } from '@/components/workspace/inspectorChrome';

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
    <div className={inspectorStack}>
      <InspectorHeader
        title={t('workspace.replaceImage')}
        subtitle={t('workspace.importReplaceHint')}
      />
      {uploadError ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-surface p-3 text-xs text-danger-ink dark:border-dark-danger-border dark:bg-dark-danger-surface dark:text-dark-danger-ink"
        >
          {uploadError}
        </p>
      ) : null}
      {confirmReplace ? (
        <div
          role="group"
          aria-label={t('workspace.replaceImage')}
          className="space-y-2 rounded-lg border border-action-blue/30 bg-action-blue-surface p-3 dark:border-blue-900 dark:bg-blue-950/30"
        >
          <p className="text-pretty text-xs text-ink dark:text-blue-100">
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
            className="w-full py-1.5 text-xs font-medium text-ink-muted underline-offset-2 hover:underline dark:text-dark-ink-muted"
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
