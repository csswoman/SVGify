'use client';

import { useId, useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface DownloadButtonProps {
  payload: string | null;
  fileName?: string;
  label?: string;
  /** Brief attention after Prepare for download. */
  highlight?: boolean;
  /** True after the user ran Prepare at least once this document. */
  prepared?: boolean;
  /**
   * When true (TopBar), download stays disabled until Prepare.
   * When false (Optimize escape hatch), allows raw download.
   */
  gateUntilPrepared?: boolean;
  className?: string;
  onDownloaded?: () => void;
}

export function DownloadButton({
  payload,
  fileName = 'vectorized.svg',
  label,
  highlight = false,
  prepared = false,
  gateUntilPrepared = false,
  className,
  onDownloaded,
}: DownloadButtonProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const hintId = useId();
  const gated = gateUntilPrepared && !prepared;
  const buttonLabel =
    label ??
    (prepared
      ? t('workspace.downloadPrepared')
      : gateUntilPrepared
      ? t('workspace.download')
        : t('workspace.downloadUnprepared'));
  const titleHint = !payload
    ? t('workspace.downloadDisabled')
    : gated
      ? t('workspace.downloadNeedsPrepare')
      : prepared
        ? undefined
        : t('workspace.downloadRaw');

  const handleDownload = () => {
    if (!payload || busy || gated) return;
    setBusy(true);

    try {
      const blob = new Blob([payload], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onDownloaded?.();
    } finally {
      window.setTimeout(() => setBusy(false), 400);
    }
  };

  const toneClass = prepared ? 'btn-primary' : 'btn-tertiary';
  const attentionClass = prepared && highlight ? 'download-attention' : '';

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={!payload || busy || gated}
        aria-busy={busy}
        aria-label={buttonLabel}
        aria-describedby={payload && (gated || !prepared) ? hintId : undefined}
        title={titleHint}
        className={[
          toneClass,
          '!min-h-10 whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:text-sm',
          highlight ? attentionClass : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {buttonLabel}
      </button>
      {payload && (gated || (!prepared && !gateUntilPrepared)) ? (
        <span id={hintId} className="sr-only">
          {gated ? t('workspace.downloadNeedsPrepare') : t('workspace.downloadRaw')}
        </span>
      ) : null}
    </>
  );
}
