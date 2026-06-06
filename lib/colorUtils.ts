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

export function parseRgbString(str: string): RGBColor | null {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(str);
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
    const fill = path.getAttribute('fill');
    if (fill) {
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

// Replace all paths with a specific fill color
export function replaceColorInSvg(svg: SVGElement, oldColor: RGBColor, newColor: RGBColor): void {
  const oldStr = rgbToString(oldColor);
  const newStr = rgbToString(newColor);

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    if (fill === oldStr) {
      path.setAttribute('fill', newStr);
      path.setAttribute('stroke', newStr);
    }
  });
}
