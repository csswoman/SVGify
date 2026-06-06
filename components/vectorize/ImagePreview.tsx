'use client';

import { useEffect, useRef } from 'react';

interface ImagePreviewProps {
  imageData: ImageData;
  label?: string;
}

export function ImagePreview({ imageData, label = 'Original' }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <canvas
        ref={canvasRef}
        className="w-full h-auto border border-gray-200 rounded-lg bg-white"
        aria-label={label}
      />
    </div>
  );
}
