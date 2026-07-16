export type DownloadPreparationPreset = 'smaller' | 'balanced' | 'detail';

export interface DownloadPreparationTargets {
  maxColors: number;
  shapeTarget: number;
  coordDecimals: number;
}

/**
 * Product-level export choices. Coordinate precision belongs here because it
 * changes final SVG weight, rather than the geometry produced by tracing.
 */
export function getDownloadPreparationTargets(
  preset: DownloadPreparationPreset,
  maxAvailableColors: number
): DownloadPreparationTargets {
  const colorLimit = Math.max(2, maxAvailableColors);

  if (preset === 'smaller') {
    return { maxColors: Math.min(4, colorLimit), shapeTarget: 30, coordDecimals: 0 };
  }

  if (preset === 'detail') {
    return { maxColors: Math.min(10, colorLimit), shapeTarget: 90, coordDecimals: 2 };
  }

  return { maxColors: Math.min(6, colorLimit), shapeTarget: 50, coordDecimals: 1 };
}
