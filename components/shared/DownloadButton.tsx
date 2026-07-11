'use client';

import { useState } from 'react';
import { prependLabelLegend } from '@/lib/labelUtils';
import { LabelInfo } from '@/lib/labelUtils';

interface DownloadButtonProps {
  svgString: string | null;
  labels?: LabelInfo[];
  fileName?: string;
  label?: string;
}

export function DownloadButton({
  svgString,
  labels = [],
  fileName = 'image.svg',
  label = 'Download SVG',
}: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);

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
    } finally {
      window.setTimeout(() => setBusy(false), 400);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!svgString || busy}
      aria-busy={busy}
      className="focus-ring min-h-10 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
    >
      {label}
    </button>
  );
}
