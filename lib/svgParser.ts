import { SVGDocument, SVGPath, RGBColor } from '@/types/svg.types';
import { parseRgbString } from '@/lib/colorUtils';
import { sanitizeSvgString } from '@/lib/sanitize';

export function parseSvgString(svgString: string): SVGDocument | null {
  try {
    // Sanitize first
    const sanitized = sanitizeSvgString(svgString);

    // Parse with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');

    // Check for parsing errors
    if (doc.documentElement.tagName === 'parsererror') {
      throw new Error('SVG parsing failed');
    }

    const svg = doc.documentElement as SVGElement;
    const paths = extractPathsFromSvg(svg);

    // Get dimensions
    const width = parseFloat(svg.getAttribute('width') || svg.getAttribute('viewBox')?.split(' ')[2] || '100');
    const height = parseFloat(svg.getAttribute('height') || svg.getAttribute('viewBox')?.split(' ')[3] || '100');

    return {
      svg,
      paths,
      width,
      height,
    };
  } catch (err) {
    console.error('Failed to parse SVG:', err);
    return null;
  }
}

export function extractPathsFromSvg(svg: SVGElement): SVGPath[] {
  const paths: SVGPath[] = [];
  let pathId = 0;

  svg.querySelectorAll('path').forEach((pathEl) => {
    const d = pathEl.getAttribute('d');
    if (!d) return;

    const fill = pathEl.getAttribute('fill') || '#000000';
    const stroke = pathEl.getAttribute('stroke');
    const opacity = parseFloat(pathEl.getAttribute('opacity') || '1');
    const label = pathEl.getAttribute('data-label');

    // Parse fill color
    let fillColor: RGBColor = { r: 0, g: 0, b: 0 };
    const parsed = parseRgbString(fill);
    if (parsed) {
      fillColor = parsed;
    } else if (fill.startsWith('#')) {
      // Try hex
      const hexMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fill);
      if (hexMatch) {
        fillColor = {
          r: parseInt(hexMatch[1], 16),
          g: parseInt(hexMatch[2], 16),
          b: parseInt(hexMatch[3], 16),
        };
      }
    }

    const strokeColor = stroke ? parseRgbString(stroke) : undefined;

    paths.push({
      id: `path-${pathId++}`,
      d,
      fill: fillColor,
      stroke: strokeColor,
      opacity,
      label,
    });
  });

  return paths;
}

export function svgElementToString(svg: SVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}
