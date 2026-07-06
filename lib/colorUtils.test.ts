import { describe, expect, it } from 'vitest';
import { extractPaletteFromSvgString, reduceSvgStringColorsToCount } from './colorUtils';

describe('reduceSvgStringColorsToCount', () => {
  it('caps many traced fill colors to the requested palette size', () => {
    const svg = [
      '<svg>',
      '<path fill="#000000" d="M0 0Z"/>',
      '<path fill="#000000" d="M1 0Z"/>',
      '<path fill="#ff0000" d="M2 0Z"/>',
      '<path fill="#ee0000" d="M3 0Z"/>',
      '<path fill="#00ff00" d="M4 0Z"/>',
      '<path fill="#0000ff" d="M5 0Z"/>',
      '</svg>',
    ].join('');

    const reduced = reduceSvgStringColorsToCount(svg, 3);

    expect(extractPaletteFromSvgString(reduced)).toHaveLength(3);
  });
});
