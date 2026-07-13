'use client';

import { useEffect, useRef, useState } from 'react';
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
  onDownloaded?: () => void;
}

export function DownloadButton({
  svgString,
  labels = [],
  fileName = 'vectorized.svg',
  label,
  highlight = false,
  prepared = false,
  onDownloaded,
}: DownloadButtonProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonLabel = label ?? (prepared ? t('workspace.downloadPrepared') : t('workspace.download'));
  const titleHint = !svgString
    ? t('workspace.downloadDisabled')
    : prepared
      ? undefined
      : t('workspace.downloadRaw');

  useEffect(() => {
    if (!highlight || !svgString) return;
    buttonRef.current?.focus({ preventScroll: true });
  }, [highlight, svgString]);

  const handleDownload = () => {
    if (!svgString || busy) return;
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

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleDownload}
      disabled={!svgString || busy}
      aria-busy={busy}
      aria-label={buttonLabel}
      title={titleHint}
      className={['btn-primary', highlight ? 'download-attention' : ''].filter(Boolean).join(' ')}
    >
      {buttonLabel}
    </button>
  );
}
