'use client';

interface CanvasOverlayProps {
  isVisible: boolean;
  label?: string;
}

export function CanvasOverlay({ isVisible, label }: CanvasOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/75 dark:bg-gray-900/75"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"
        aria-hidden
      />
      {label ? (
        <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{label}</p>
      ) : null}
    </div>
  );
}
