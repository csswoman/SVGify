'use client';

import { useEffect, useRef } from 'react';
import type { SeedPoint } from '@/lib/backgroundRemoval';

interface ImagePreviewProps {
  imageData: ImageData;
  label?: string;
  /** When set, clicking the canvas reports the clicked pixel (in image coords). */
  onPick?: (point: SeedPoint) => void;
  /** Points to mark on the image (already-picked background seeds). */
  seeds?: SeedPoint[];
}

export function ImagePreview({ imageData, label = 'Original', onPick, seeds }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Draw markers for picked seed points.
    if (seeds && seeds.length > 0) {
      const radius = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.012));
      for (const s of seeds) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.9)'; // blue-600
        ctx.fill();
        ctx.lineWidth = Math.max(2, radius / 3);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }
  }, [imageData, seeds]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Map CSS pixel click to the canvas's intrinsic image pixels.
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    onPick({ x, y });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`w-full h-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white${
          onPick ? ' cursor-crosshair' : ''
        }`}
        aria-label={onPick ? `${label} — click the background to remove it` : label}
      />
    </div>
  );
}
