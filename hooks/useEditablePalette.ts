import { useCallback, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { colorDistanceSq, rgbToHex } from '@/lib/colorUtils';

function sameColor(a: RGBColor, b: RGBColor): boolean {
  return rgbToHex(a) === rgbToHex(b);
}

function uniqueColors(colors: RGBColor[]): RGBColor[] {
  const seen = new Set<string>();
  const out: RGBColor[] = [];

  for (const color of colors) {
    const hex = rgbToHex(color);
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(color);
  }

  return out;
}

export function useEditablePalette(initialColors: RGBColor[] = []) {
  const [colors, setColors] = useState<RGBColor[]>(() => uniqueColors(initialColors));
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(() => initialColors[0] ?? null);

  const replacePalette = useCallback((nextColors: RGBColor[]) => {
    const next = uniqueColors(nextColors);
    setColors(next);
    setSelectedColor((current) => {
      if (current && next.some((color) => sameColor(color, current))) return current;
      return next[0] ?? null;
    });
    return next;
  }, []);

  const selectColor = useCallback((color: RGBColor) => {
    setSelectedColor(color);
  }, []);

  const updateSelectedColor = useCallback((newColor: RGBColor) => {
    let nextPalette: RGBColor[] = [];
    setColors((current) => {
      if (!selectedColor) {
        nextPalette = uniqueColors([...current, newColor]);
        return nextPalette;
      }

      nextPalette = uniqueColors(current.map((color) => (sameColor(color, selectedColor) ? newColor : color)));
      return nextPalette;
    });
    setSelectedColor(newColor);
    return nextPalette;
  }, [selectedColor]);

  const deleteColor = useCallback((target: RGBColor) => {
    let nextPalette: RGBColor[] = [];
    setColors((current) => {
      if (current.length <= 1) {
        nextPalette = current;
        return current;
      }
      nextPalette = current.filter((color) => !sameColor(color, target));
      return nextPalette;
    });
    setSelectedColor((current) => {
      if (current && !sameColor(current, target)) return current;
      return nextPalette[0] ?? null;
    });
    return nextPalette;
  }, []);

  const mergeSimilar = useCallback((threshold = 36) => {
    const thresholdSq = threshold * threshold;
    let nextPalette: RGBColor[] = [];

    setColors((current) => {
      const merged: RGBColor[] = [];
      for (const color of current) {
        if (!merged.some((candidate) => colorDistanceSq(candidate, color) <= thresholdSq)) {
          merged.push(color);
        }
      }
      nextPalette = merged;
      return merged;
    });
    setSelectedColor((current) => {
      if (current && nextPalette.some((color) => sameColor(color, current))) return current;
      return nextPalette[0] ?? null;
    });
    return nextPalette;
  }, []);

  return {
    colors,
    selectedColor,
    replacePalette,
    selectColor,
    updateSelectedColor,
    deleteColor,
    mergeSimilar,
  };
}
