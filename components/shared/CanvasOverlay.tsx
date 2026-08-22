'use client';

interface CanvasOverlayProps {
  isVisible: boolean;
  label?: string;
}

export function CanvasOverlay({ isVisible, label }: CanvasOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/75 dark:bg-dark-bg/75"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent dark:border-dark-border dark:border-t-dark-accent"
        aria-hidden
      />
      {label ? (
        <p className="text-xs font-medium text-ink dark:text-dark-ink">{label}</p>
      ) : null}
    </div>
  );
}
