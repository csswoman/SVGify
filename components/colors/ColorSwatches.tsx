'use client';

import { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';

interface ColorSwatchesProps {
  colors: RGBColor[];
  onColorClick: (color: RGBColor) => void;
  selectedColor: RGBColor | null;
}

export function ColorSwatches({ colors, onColorClick, selectedColor }: ColorSwatchesProps) {
  if (colors.length === 0) {
    return <p className="text-sm text-gray-400">No colors found.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Palette ({colors.length} colors)</p>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {colors.map((color, idx) => {
          const hex = rgbToHex(color);
          const isSelected =
            selectedColor !== null && rgbToHex(selectedColor) === hex;

          return (
            <button
              key={idx}
              onClick={() => onColorClick(color)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isSelected
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              aria-label={`Select color ${hex}`}
              aria-pressed={isSelected}
            >
              <span
                className="w-7 h-7 rounded border border-gray-300 shrink-0"
                style={{ backgroundColor: hex }}
              />
              <span className="font-mono text-gray-700">{hex}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
