'use client';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm p-1">
      <button
        onClick={onZoomOut}
        className="w-8 h-8 rounded hover:bg-gray-100 text-gray-700 font-bold transition"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={onReset}
        className="px-2 h-8 rounded hover:bg-gray-100 text-xs font-mono text-gray-600 transition min-w-[3rem]"
        aria-label="Reset zoom"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="w-8 h-8 rounded hover:bg-gray-100 text-gray-700 font-bold transition"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}
