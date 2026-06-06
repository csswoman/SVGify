'use client';

import { prependLabelLegend } from '@/lib/labelUtils';
import { LabelInfo } from '@/lib/labelUtils';

interface DownloadButtonProps {
  svgString: string | null;
  labels?: LabelInfo[];
  fileName?: string;
}

export function DownloadButton({ svgString, labels = [], fileName = 'image.svg' }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!svgString) return;

    // Add label legend comment if labels exist
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
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!svgString}
      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
    >
      Download SVG
    </button>
  );
}
