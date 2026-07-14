'use client';

import { useEffect, useState, type RefObject } from 'react';
import {
  computeVectorizePreviewBounds,
  computeVectorizePreviewSize,
  type CanvasDisplaySize,
} from '@/lib/canvasDisplaySize';
import { readViewBoxFromSvgString } from '@/lib/svgViewBox';

const XL_MEDIA = '(min-width: 1280px)';

interface VectorizePreviewSizes {
  image: CanvasDisplaySize | null;
  svg: CanvasDisplaySize | null;
}

interface UseVectorizePreviewSizesOptions {
  panelRef: RefObject<HTMLElement | null>;
  imageData: ImageData | null;
  svgString: string | null;
  twoColumns?: boolean;
}

export function useVectorizePreviewSizes({
  panelRef,
  imageData,
  svgString,
  twoColumns = false,
}: UseVectorizePreviewSizesOptions): VectorizePreviewSizes {
  const [sizes, setSizes] = useState<VectorizePreviewSizes>({ image: null, svg: null });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !imageData) {
      setSizes({ image: null, svg: null });
      return;
    }

    const recompute = () => {
      const useTwoColumns = twoColumns && window.matchMedia(XL_MEDIA).matches;
      const bounds = computeVectorizePreviewBounds(panel.clientWidth, useTwoColumns);
      const imageSize = computeVectorizePreviewSize(
        { w: imageData.width, h: imageData.height },
        bounds
      );

      const svgViewBox = svgString ? readViewBoxFromSvgString(svgString) : null;
      const svgSource = svgViewBox ?? { w: imageData.width, h: imageData.height };
      const svgSize = computeVectorizePreviewSize(svgSource, bounds);

      setSizes({ image: imageSize, svg: svgSize });
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(panel);
    window.addEventListener('resize', recompute);

    const media = window.matchMedia(XL_MEDIA);
    media.addEventListener('change', recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
      media.removeEventListener('change', recompute);
    };
  }, [panelRef, imageData, svgString, twoColumns]);

  return sizes;
}
