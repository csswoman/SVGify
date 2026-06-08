import { isNearWhite, removeNearWhitePixels } from './paletteExtraction';
import { removeBackground } from './backgroundRemoval';

export {
  ICON_BASE_PALETTE as ICON_VECTOR_PALETTE,
  iconTracePalette,
  isNearWhite,
  nearestPaletteColor as nearestIconPaletteColor,
  quantizeImageToPalette as quantizeImageToIconPalette,
  removeNearWhitePixels,
  snapSvgToPalette as snapSvgToIconPalette,
  suggestPaletteFromImage as buildIconTracePalette,
} from './paletteExtraction';

export type { TracePaletteColor } from './paletteExtraction';

export function prepareIconSourceImage(imageData: ImageData): ImageData {
  return removeNearWhitePixels(
    removeBackground(imageData, {
      tolerance: 42,
      contiguous: true,
    })
  );
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

export function removeSmallSvgPathsByBounds(svg: string, minArea = 16): string {
  return svg.replace(/<path\b(?=[^>]*\bd="([^"]*)")[^>]*>/g, (tag: string, d: string) => {
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
  });
}

