'use client';

interface CanvasOverlayProps {
  isVisible: boolean;
}

export function CanvasOverlay({ isVisible }: CanvasOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-gray-900/40">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400" />
    </div>
  );
}
