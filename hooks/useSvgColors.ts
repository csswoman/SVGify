import { useCallback, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import {
  extractColorsFromSvg,
  replaceColorInSvg,
  replaceColorsInSvg,
  rgbToHex,
  colorDistanceSq,
  luminance,
  parseRgbString,
} from '@/lib/colorUtils';

interface ColorStat {
  color: RGBColor;
  weight: number;
}

function pathWeight(path: SVGPathElement): number {
  return Math.max(1, (path.getAttribute('d')?.match(/-?\d*\.?\d+/g) ?? []).length);
}

function getColorStats(svgElement: SVGElement): ColorStat[] {
  const stats = new Map<string, ColorStat>();

  svgElement.querySelectorAll('path').forEach((path) => {
    if (path.closest('defs') || path.closest('[data-svgcraft-editor]')) return;
    const fill = path.getAttribute('fill');
    const stroke = path.getAttribute('stroke');
    const visibleColor = fill && fill !== 'none' ? fill : stroke;
    if (!visibleColor || visibleColor === 'none') return;
    const color = parseRgbString(visibleColor);
    if (!color) return;

    const hex = rgbToHex(color);
    const current = stats.get(hex);
    if (current) {
      current.weight += pathWeight(path as SVGPathElement);
    } else {
      const weight = pathWeight(path as SVGPathElement);
      stats.set(hex, { color, weight });
    }
  });

  return [...stats.values()].sort((a, b) => b.weight - a.weight);
}

export function useSvgColors(svgElement: SVGElement | null) {
  const [colors, setColors] = useState<RGBColor[]>([]);

  const refreshColors = useCallback((): RGBColor[] => {
    if (!svgElement) {
      setColors([]);
      return [];
    }

    const nextColors = getColorStats(svgElement).map((stat) => stat.color);
    setColors(nextColors);
    return nextColors;
  }, [svgElement]);

  // Extract unique colors from SVG
  const extractColors = useCallback(() => {
    refreshColors();
  }, [refreshColors]);

  // Replace a color globally
  const replaceColor = useCallback(
    (oldColor: RGBColor, newColor: RGBColor) => {
      if (!svgElement) return;
      replaceColorInSvg(svgElement, oldColor, newColor);
      refreshColors();
    },
    [svgElement, refreshColors]
  );

  // Merge all colors within `threshold` RGB distance into shared representatives.
  // Returns how many colors were removed (for user feedback).
  const mergeSimilar = useCallback(
    (threshold: number): number => {
      if (!svgElement) return 0;
      const current = getColorStats(svgElement).map((stat) => stat.color);
      const thrSq = threshold * threshold;
      const reps: RGBColor[] = [];
      const replacements = new Map<string, RGBColor>();
      let mergedCount = 0;

      for (const c of current) {
        const rep = reps.find((r) => colorDistanceSq(r, c) <= thrSq);
        if (rep) {
          replacements.set(rgbToHex(c), rep);
          mergedCount++;
        } else {
          reps.push(c);
        }
      }
      replaceColorsInSvg(svgElement, replacements);
      refreshColors();
      return mergedCount;
    },
    [svgElement, refreshColors]
  );

  // Delete a color: repaint its regions with the most similar remaining color.
  const deleteColor = useCallback(
    (target: RGBColor) => {
      if (!svgElement) return;
      const current = getColorStats(svgElement).map((stat) => stat.color);
      const targetHex = rgbToHex(target);
      const remaining = current.filter((c) => rgbToHex(c) !== targetHex);
      if (remaining.length === 0) return; // never remove the last color

      // Nearest remaining color by RGB distance.
      let nearest = remaining[0];
      let best = colorDistanceSq(target, nearest);
      for (const c of remaining) {
        const d = colorDistanceSq(target, c);
        if (d < best) {
          best = d;
          nearest = c;
        }
      }
      replaceColorInSvg(svgElement, target, nearest);
      refreshColors();
    },
    [svgElement, refreshColors]
  );

  // Reduce the palette down to at most `targetCount` colors.
  // Keep the most-used colors and reassign small/noisy colors to the nearest
  // dominant color. This is predictable for common users: visible colors stay.
  const reduceToCount = useCallback(
    (targetCount: number) => {
      if (!svgElement) return;
      const count = Math.max(1, Math.floor(targetCount));
      const ranked = getColorStats(svgElement);
      if (ranked.length <= count) {
        refreshColors();
        return;
      }

      const dominant = ranked.slice(0, count).map((stat) => stat.color);
      const replacements = new Map<string, RGBColor>();
      for (const { color } of ranked.slice(count)) {
        let nearest = dominant[0];
        let best = colorDistanceSq(color, nearest);
        for (const candidate of dominant) {
          const distance = colorDistanceSq(color, candidate);
          if (distance < best) {
            best = distance;
            nearest = candidate;
          }
        }
        if (rgbToHex(color) !== rgbToHex(nearest)) {
          replacements.set(rgbToHex(color), nearest);
        }
      }
      replaceColorsInSvg(svgElement, replacements);
      refreshColors();
    },
    [svgElement, refreshColors]
  );

  // Normalize the palette: collapse near-duplicate shades into clean colors,
  // capped at `maxColors`. One-click tidy-up for the current SVG.
  const normalizePalette = useCallback(
    (maxColors = 6) => {
      if (!svgElement) return;

      // 1) Cluster near-identical shades into one representative.
      const reps: RGBColor[] = [];
      const thrSq = 48 * 48;
      const assign = (c: RGBColor): RGBColor => {
        let rep = reps.find((r) => colorDistanceSq(r, c) <= thrSq);
        if (!rep) {
          rep = c;
          reps.push(rep);
        }
        return rep;
      };
      const replacements = new Map<string, RGBColor>();
      for (const c of getColorStats(svgElement).map((stat) => stat.color)) {
        const rep = assign(c);
        if (rgbToHex(rep) !== rgbToHex(c)) replacements.set(rgbToHex(c), rep);
      }
      replaceColorsInSvg(svgElement, replacements);

      reduceToCount(maxColors);
    },
    [svgElement, reduceToCount]
  );

  // Snap all dark colors (luminance below threshold) to pure black #000.
  // Collapses the many near-black shades into a single clean black.
  const snapDarksToBlack = useCallback(
    (threshold: number) => {
      if (!svgElement) return;
      const current = extractColorsFromSvg(svgElement);
      const black: RGBColor = { r: 0, g: 0, b: 0 };
      const replacements = new Map<string, RGBColor>();
      for (const c of current) {
        if (rgbToHex(c) !== '#000000' && luminance(c) <= threshold) {
          replacements.set(rgbToHex(c), black);
        }
      }
      replaceColorsInSvg(svgElement, replacements);
      refreshColors();
    },
    [svgElement, refreshColors]
  );

  // Sort the current palette by vibrance (primary/secondary colors first).
  const sortByVibrance = useCallback(() => {
    refreshColors();
  }, [refreshColors]);

  // Replace color of a specific path
  const replacePathColor = useCallback(
    (pathEl: SVGPathElement, newColor: RGBColor, previousColor?: RGBColor) => {
      const rgbStr = `rgb(${newColor.r},${newColor.g},${newColor.b})`;
      const fill = pathEl.getAttribute('fill');
      if (fill && fill !== 'none') pathEl.setAttribute('fill', rgbStr);
      const stroke = pathEl.getAttribute('stroke');
      const strokeColor = stroke ? parseRgbString(stroke) : null;
      if (
        strokeColor &&
        (fill === 'none' || (previousColor && rgbToHex(strokeColor) === rgbToHex(previousColor)))
      ) {
        pathEl.setAttribute('stroke', rgbStr);
      }
      refreshColors();
    },
    [refreshColors]
  );

  return {
    colors,
    extractColors,
    replaceColor,
    replacePathColor,
    mergeSimilar,
    deleteColor,
    reduceToCount,
    sortByVibrance,
    snapDarksToBlack,
    normalizePalette,
  };
}
