import { isNearWhite } from './paletteExtraction';
import { colorDistanceSq, parseRgbString } from './colorUtils';
import { removeBackground, removeExposedNearWhiteFringe } from './backgroundRemoval';
import { parsePathD } from './pathEditor';

export {
  ICON_BASE_PALETTE as ICON_VECTOR_PALETTE,
  iconTracePalette,
  isNearWhite,
  isDropShadowColor,
  nearestPaletteColor as nearestIconPaletteColor,
  quantizeImageToPalette as quantizeImageToIconPalette,
  removeNearWhitePixels,
  snapSvgToPalette as snapSvgToIconPalette,
  suggestPaletteFromImage as buildIconTracePalette,
} from './paletteExtraction';

export type { TracePaletteColor } from './paletteExtraction';

export function prepareIconSourceImage(imageData: ImageData): ImageData {
  const withoutBg = removeBackground(imageData, {
    tolerance: 42,
    contiguous: true,
  });
  // Peel anti-aliased white halos touching transparency; keep enclosed white fills.
  return removeExposedNearWhiteFringe(withoutBg);
}

export function removeNearWhiteSvgPaths(svg: string, threshold = 244): string {
  return svg.replace(
    /<path\b[^>]*\bfill="rgb\((\d+),\s*(\d+),\s*(\d+)\)"[^>]*>/g,
    (tag: string, r: string, g: string, b: string) => {
      const color = { r: Number(r), g: Number(g), b: Number(b) };
      return isNearWhite(color, threshold) ? '' : tag;
    }
  );
}

export function removeSmallNearWhiteSvgPaths(svg: string, minArea = 24, threshold = 244): string {
  return svg.replace(
    /<path\b(?=[^>]*\bd="([^"]*)")[^>]*\bfill="rgb\((\d+),\s*(\d+),\s*(\d+)\)"[^>]*>/g,
    (tag: string, d: string, r: string, g: string, b: string) => {
      if (!isNearWhite({ r: Number(r), g: Number(g), b: Number(b) }, threshold)) return tag;

      const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
      if (numbers.length < 4) return '';

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let pointCount = 0;

      for (let i = 0; i + 1 < numbers.length; i += 2) {
        const x = numbers[i];
        const y = numbers[i + 1];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        pointCount++;
      }

      const area = (maxX - minX) * (maxY - minY);
      return pointCount >= 2 && area >= minArea ? tag : '';
    }
  );
}

function pathBoundingArea(d: string): number {
  const segments = parsePathD(d);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let pointCount = 0;

  for (const segment of segments) {
    for (const point of segment.pts) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      pointCount++;
    }
  }

  if (pointCount < 2 || !Number.isFinite(minX)) return 0;
  return Math.max(0, (maxX - minX) * (maxY - minY));
}

export function removeSmallSvgPathsByBounds(
  svg: string,
  minArea = 16,
  preserveFillColors: readonly { r: number; g: number; b: number }[] = []
): string {
  return svg.replace(/<path\b(?=[^>]*\bd="([^"]*)")[^>]*>/g, (tag: string, d: string) => {
    const fillMatch = tag.match(/\bfill="([^"]+)"/i);
    if (fillMatch && preserveFillColors.length > 0) {
      const fill = parseRgbString(fillMatch[1]);
      if (fill) {
        const keep = preserveFillColors.some(
          (color) => colorDistanceSq(fill, color) <= 36 * 36
        );
        if (keep) return tag;
      }
    }

    // Parse the real path geometry — relative h/v commands otherwise inflate
    // the naive number-pair bounding box and keep matte edge dust around.
    return pathBoundingArea(d) >= minArea ? tag : '';
  });
}
