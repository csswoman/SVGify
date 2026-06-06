import { useCallback, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { extractColorsFromSvg, replaceColorInSvg, rgbToHex } from '@/lib/colorUtils';

export function useSvgColors(svgElement: SVGElement | null) {
  const [colors, setColors] = useState<RGBColor[]>([]);

  // Extract unique colors from SVG
  const extractColors = useCallback(() => {
    if (!svgElement) return;
    const extracted = extractColorsFromSvg(svgElement);
    setColors(extracted);
  }, [svgElement]);

  // Replace a color globally
  const replaceColor = useCallback(
    (oldColor: RGBColor, newColor: RGBColor) => {
      if (!svgElement) return;
      replaceColorInSvg(svgElement, oldColor, newColor);
      // Update colors list (newColor replaces oldColor)
      setColors((prev) =>
        prev.map((c) =>
          rgbToHex(c) === rgbToHex(oldColor) ? newColor : c
        )
      );
    },
    [svgElement]
  );

  // Replace color of a specific path
  const replacePathColor = useCallback(
    (pathEl: SVGPathElement, newColor: RGBColor) => {
      const rgbStr = `rgb(${newColor.r},${newColor.g},${newColor.b})`;
      pathEl.setAttribute('fill', rgbStr);
      pathEl.setAttribute('stroke', rgbStr);
    },
    []
  );

  return {
    colors,
    extractColors,
    replaceColor,
    replacePathColor,
  };
}
