'use client';

import { useEffect, useRef } from 'react';
import { sanitizeSvgString } from '@/lib/sanitize';
import type { CanvasDisplaySize } from '@/lib/canvasDisplaySize';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface SvgPreviewProps {
  svgString: string | null;
  displaySize?: CanvasDisplaySize | null;
  onPathClick?: (pathEl: SVGPathElement) => void;
  onSvgMount?: (svg: SVGSVGElement | null) => void;
}

function SvgPreviewInner({ svgString, displaySize, onPathClick, onSvgMount }: SvgPreviewProps) {
  // Separate refs: one for the imperative SVG mount zone, one for the placeholder
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!svgString) {
      mount.replaceChildren();
      onSvgMount?.(null);
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
      // Keep the intrinsic viewBox so the whole drawing stays visible.
      // imagetracerjs emits width/height in px; ensure a viewBox exists, then
      // let the SVG scale to fit the container without cropping.
      if (!svg.getAttribute('viewBox')) {
        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        if (w && h) svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      }
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.maxHeight = '100%';
      svg.style.display = 'block';

      if (onPathClick) {
        svg.querySelectorAll('path').forEach((path) => {
          path.style.cursor = 'pointer';
          path.addEventListener('click', () => onPathClick(path));
        });
      }

      // Safe imperative mount — React never renders children into mountRef
      mount.replaceChildren(svg);
      onSvgMount?.(svg as unknown as SVGSVGElement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      mount.replaceChildren(
        Object.assign(document.createElement('p'), {
          textContent: `Could not render SVG: ${msg}`,
          className: 'text-red-500 text-sm p-4',
        })
      );
    }
  }, [svgString, onPathClick, onSvgMount]);

  return (
    <div
      className={`transparent-preview relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700${
        displaySize ? ' mx-auto w-fit max-w-full' : ' w-full h-full'
      }`}
      style={
        displaySize ? { width: displaySize.width, height: displaySize.height } : undefined
      }
      aria-label="SVG preview"
    >
      {/* Placeholder: React-managed, shown only when there is no SVG yet */}
      {!svgString && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm">Preview will appear here after vectorization</p>
        </div>
      )}
      {/* Mount zone: React never renders children here — imperative only */}
      <div ref={mountRef} className="w-full h-full" />
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
