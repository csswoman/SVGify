'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { sanitizeSvgString } from '@/lib/sanitize';
import { parseRgbString } from '@/lib/colorUtils';
import { ColorSwatches } from './ColorSwatches';
import { ColorPicker } from './ColorPicker';

interface ColorEditStepProps {
  svgString: string;
  onColorsEdited: (svgString: string) => void;
}

export function ColorEditStep({ svgString, onColorsEdited }: ColorEditStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const { colors, extractColors, replaceColor } = useSvgColors(svgEl);

  // Mount SVG once on load; extract colors from DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgString) return;

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') throw new Error('Invalid SVG');

      const svg = doc.documentElement as unknown as SVGElement;
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.maxWidth = '100%';

      // Path click → select its fill color
      svg.querySelectorAll('path').forEach((path) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', () => {
          const fill = path.getAttribute('fill');
          if (!fill) return;
          const color = parseRgbString(fill);
          if (color) setSelectedColor(color);
        });
      });

      container.replaceChildren(svg);
      setSvgEl(svg);
    } catch (err) {
      console.error('ColorEditStep: failed to mount SVG', err);
    }
  }, [svgString]);

  // Extract colors whenever the mounted svg changes
  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  const handleColorPickerChange = useCallback(
    (newColor: RGBColor) => {
      if (!selectedColor) return;
      replaceColor(selectedColor, newColor);
      setSelectedColor(newColor);
    },
    [selectedColor, replaceColor]
  );

  const handleContinue = () => {
    if (!svgEl) return;
    const edited = new XMLSerializer().serializeToString(svgEl);
    onColorsEdited(edited);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Edit Colors</h1>
        <p className="text-gray-500">
          Click a color swatch or a path in the preview to select it, then pick a new color.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SVG preview */}
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="w-full min-h-72 border border-gray-200 rounded-lg bg-white overflow-hidden flex items-center justify-center"
            aria-label="SVG color editor"
          />
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <ColorSwatches
            colors={colors}
            onColorClick={setSelectedColor}
            selectedColor={selectedColor}
          />

          {selectedColor && (
            <ColorPicker color={selectedColor} onChange={handleColorPickerChange} />
          )}

          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Continue to Labels →
          </button>
        </div>
      </div>
    </div>
  );
}
