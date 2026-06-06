'use client';

import { useEffect, useRef } from 'react';
import { sanitizeSvgString } from '@/lib/sanitize';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface SvgPreviewProps {
  svgString: string | null;
  onPathClick?: (pathEl: SVGPathElement) => void;
}

function SvgPreviewInner({ svgString, onPathClick }: SvgPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!svgString) {
      container.innerHTML = '';
      return;
    }

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') {
        throw new Error('SVG could not be parsed');
      }

      const svg = doc.documentElement as unknown as SVGElement;

      // Make SVG fill its container
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxWidth = '100%';

      // Add click handlers if a callback is provided
      if (onPathClick) {
        svg.querySelectorAll('path').forEach((path) => {
          path.style.cursor = 'pointer';
          path.addEventListener('click', () => onPathClick(path));
        });
      }

      // Safe DOM mount — no innerHTML on untrusted strings
      container.replaceChildren(svg);
    } catch (err) {
      container.replaceChildren(
        Object.assign(document.createElement('p'), {
          textContent: `Could not render SVG: ${err instanceof Error ? err.message : 'Unknown error'}`,
          className: 'text-red-500 text-sm',
        })
      );
    }
  }, [svgString, onPathClick]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-72 flex items-center justify-center border border-gray-200 rounded-lg bg-white overflow-hidden"
      aria-label="SVG preview"
    >
      {!svgString && (
        <p className="text-gray-400 text-sm">Preview will appear here after vectorization</p>
      )}
    </div>
  );
}

export function SvgPreview(props: SvgPreviewProps) {
  return (
    <ErrorBoundary>
      <SvgPreviewInner {...props} />
    </ErrorBoundary>
  );
}
