import { RGBColor } from '@/types/svg.types';

export function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function rgbToString(color: RGBColor): string {
  return `rgb(${color.r},${color.g},${color.b})`;
}

/** Perceived luminance 0..255 (Rec. 601). Low = dark color. */
export function luminance(c: RGBColor): number {
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

export function parseRgbString(str: string): RGBColor | null {
  const match = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\s*\)/.exec(str);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

export function isValidRgb(rgb: RGBColor): boolean {
  return (
    rgb.r >= 0 && rgb.r <= 255 &&
    rgb.g >= 0 && rgb.g <= 255 &&
    rgb.b >= 0 && rgb.b <= 255
  );
}

// Extract unique colors from SVG DOM
export function extractColorsFromSvg(svg: SVGElement): RGBColor[] {
  const colors: RGBColor[] = [];
  const seen = new Set<string>();

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    ['fill', 'stroke'].forEach((attr) => {
      const value = path.getAttribute(attr);
      if (value && value !== 'none') {
        const color = parseRgbString(value);
        if (color) {
          const hex = rgbToHex(color);
          if (!seen.has(hex)) {
            seen.add(hex);
            colors.push(color);
          }
        }
      }
    });
  });

  return colors;
}

function collectSvgStringColors(svg: string): RGBColor[] {
  const colors: RGBColor[] = [];
  const seen = new Set<string>();
  const re = /\b(?:fill|stroke)="rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\s*\)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const color = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
    const hex = rgbToHex(color);
    if (!seen.has(hex)) {
      seen.add(hex);
      colors.push(color);
    }
  }
  return colors;
}

// Extract unique colors from SVG DOM
export function extractFillColorsFromSvg(svg: SVGElement): RGBColor[] {
  const colors: RGBColor[] = [];
  const seen = new Set<string>();

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    if (fill && fill !== 'none') {
      const color = parseRgbString(fill);
      if (color) {
        const hex = rgbToHex(color);
        if (!seen.has(hex)) {
          seen.add(hex);
          colors.push(color);
        }
      }
    }
  });

  return colors;
}

// Extract the unique fill colors from a raw SVG string, in order of first
// appearance. Used to preview the palette without mounting the SVG.
export function extractPaletteFromSvgString(svg: string): RGBColor[] {
  return collectSvgStringColors(svg);
}

/**
 * "Vibrance" score 0..1: how vivid/primary a color feels.
 * High saturation scores high; very dark, very light, or grayish colors score
 * low. Used to prioritize primary/secondary colors over dull near-blacks/grays.
 */
export function colorVibrance(c: RGBColor): number {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  // Lightness weight: peaks around mid-lightness (0.5), falls off toward 0/1.
  const lWeight = 1 - Math.abs(l - 0.5) * 2; // 1 at l=0.5, 0 at l=0 or 1
  // Saturation dominates; lightness modulates so pure black/white score ~0.
  return sat * (0.4 + 0.6 * lWeight);
}

/** Squared RGB distance between two colors. */
export function colorDistanceSq(a: RGBColor, b: RGBColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Group an SVG's fill colors into clusters of similar shades and return a map
 * from every original color (hex) to the representative color of its cluster.
 * `threshold` is the max RGB distance (0..~441) for two colors to merge.
 * The representative is the most-used color in each cluster.
 */
export function buildColorMergeMap(
  svg: string,
  threshold: number
): Map<string, RGBColor> {
  // Count usage of each color so the dominant shade wins.
  const counts = new Map<string, { color: RGBColor; n: number }>();
  const re = /fill="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const color = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
    const hex = rgbToHex(color);
    const entry = counts.get(hex);
    if (entry) entry.n++;
    else counts.set(hex, { color, n: 1 });
  }

  // Sort by usage (most common first) so they become cluster representatives.
  const sorted = [...counts.values()].sort((a, b) => b.n - a.n);
  const thrSq = threshold * threshold;
  const reps: RGBColor[] = [];
  const map = new Map<string, RGBColor>();

  for (const { color } of sorted) {
    let rep = reps.find((r) => colorDistanceSq(r, color) <= thrSq);
    if (!rep) {
      rep = color;
      reps.push(rep);
    }
    map.set(rgbToHex(color), rep);
  }
  return map;
}

/**
 * Apply a color merge map to a raw SVG string, rewriting fill (and stroke)
 * attributes. Colors not in the map are left unchanged.
 */
export function applyColorMergeToSvgString(
  svg: string,
  map: Map<string, RGBColor>
): string {
  return svg.replace(
    /(fill|stroke)="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g,
    (full, attr: string, r: string, g: string, b: string) => {
      const hex = rgbToHex({ r: Number(r), g: Number(g), b: Number(b) });
      const rep = map.get(hex);
      return rep ? `${attr}="${rgbToString(rep)}"` : full;
    }
  );
}

/** Convenience: merge similar colors in an SVG string in one call. */
export function simplifyColors(svg: string, threshold: number): string {
  if (threshold <= 0) return svg;
  const map = buildColorMergeMap(svg, threshold);
  return applyColorMergeToSvgString(svg, map);
}

// Replace all paths with a specific fill color
export function replaceColorInSvg(svg: SVGElement, oldColor: RGBColor, newColor: RGBColor): void {
  const newStr = rgbToString(newColor);
  const oldHex = rgbToHex(oldColor);

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    const fillColor = fill ? parseRgbString(fill) : null;
    if (fillColor && rgbToHex(fillColor) === oldHex) {
      path.setAttribute('fill', newStr);
    }

    const stroke = path.getAttribute('stroke');
    const strokeColor = stroke ? parseRgbString(stroke) : null;
    if (strokeColor && rgbToHex(strokeColor) === oldHex) {
      path.setAttribute('stroke', newStr);
    }
  });
}
