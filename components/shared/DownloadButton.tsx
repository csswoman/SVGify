'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { prependLabelLegend } from '@/lib/labelUtils';
import { LabelInfo } from '@/lib/labelUtils';
import { useI18n } from '@/lib/i18n';

interface DownloadButtonProps {
  svgString: string | null;
  labels?: LabelInfo[];
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
  svgString,
  labels = [],
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const gated = gateUntilPrepared && !prepared;
  const buttonLabel =
    label ??
    (prepared
      ? t('workspace.downloadPrepared')
      : gateUntilPrepared
        ? t('workspace.download')
        : t('workspace.downloadUnprepared'));
  const titleHint = !svgString
    ? t('workspace.downloadDisabled')
    : gated
      ? t('workspace.downloadNeedsPrepare')
      : prepared
        ? undefined
        : t('workspace.downloadRaw');

  useEffect(() => {
    if (!highlight || !svgString || !prepared) return;
    buttonRef.current?.focus({ preventScroll: true });
  }, [highlight, svgString, prepared]);

  const handleDownload = () => {
    if (!svgString || busy || gated) return;
    setBusy(true);

    try {
      let content = svgString;
      if (labels.length > 0) {
        content = prependLabelLegend(svgString, labels);
      }

      const blob = new Blob([content], { type: 'image/svg+xml' });
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
        ref={buttonRef}
        type="button"
        onClick={handleDownload}
        disabled={!svgString || busy || gated}
        aria-busy={busy}
        aria-label={buttonLabel}
        aria-describedby={svgString && (gated || !prepared) ? hintId : undefined}
        title={titleHint}
        className={[
          toneClass,
          '!min-h-10 whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:text-sm',
          attentionClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {buttonLabel}
      </button>
      {svgString && (gated || (!prepared && !gateUntilPrepared)) ? (
        <span id={hintId} className="sr-only">
          {gated ? t('workspace.downloadNeedsPrepare') : t('workspace.downloadRaw')}
        </span>
      ) : null}
    </>
  );
}
