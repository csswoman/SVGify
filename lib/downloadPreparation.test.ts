import { describe, expect, it } from 'vitest';
import { getDownloadPreparationTargets } from './downloadPreparation';

describe('download preparation presets', () => {
  it('uses progressively more coordinate precision from smaller to detail', () => {
    expect(getDownloadPreparationTargets('smaller', 12).coordDecimals).toBe(0);
    expect(getDownloadPreparationTargets('balanced', 12).coordDecimals).toBe(1);
    expect(getDownloadPreparationTargets('detail', 12).coordDecimals).toBe(2);
  });

  it('does not request more colors than the SVG contains', () => {
    expect(getDownloadPreparationTargets('detail', 3).maxColors).toBe(3);
  });
});
