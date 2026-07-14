'use client';

import { useEffect, useRef } from 'react';
import { sanitizeSvgString } from '@/lib/sanitize';
import type { CanvasDisplaySize } from '@/lib/canvasDisplaySize';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useI18n } from '@/lib/i18n';

interface SvgPreviewProps {
  svgString: string | null;
  displaySize?: CanvasDisplaySize | null;
  onPathClick?: (pathEl: SVGPathElement) => void;
  onSvgMount?: (svg: SVGSVGElement | null) => void;
  transparentBackground?: boolean;
}

function SvgPreviewInner({
  svgString,
  displaySize,
  onPathClick,
  onSvgMount,
  transparentBackground = true,
}: SvgPreviewProps) {
  const { t } = useI18n();
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
        throw new Error(t('error.unknown'));
      }

      const svg = doc.documentElement as unknown as SVGElement;
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

      mount.replaceChildren(svg);
      onSvgMount?.(svg as unknown as SVGSVGElement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.unknown');
      mount.replaceChildren(
        Object.assign(document.createElement('p'), {
          textContent: t('vec.renderError').replace('{message}', msg),
          className: 'text-red-500 text-sm p-4',
          role: 'alert',
        })
      );
    }
  }, [svgString, onPathClick, onSvgMount, t]);

  return (
    <div
      className={`${transparentBackground ? 'transparent-preview ' : ''}relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700${
        displaySize ? ' mx-auto w-fit max-w-full' : ' w-full h-full'
      }`}
      style={
        displaySize ? { width: displaySize.width, height: displaySize.height } : undefined
      }
      role="img"
      aria-label={t('a11y.svgPreview')}
    >
      {!svgString && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-pretty p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('vec.previewPlaceholder')}
          </p>
        </div>
      )}
      <div ref={mountRef} className="h-full w-full" />
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
