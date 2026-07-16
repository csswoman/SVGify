import { describe, expect, it } from 'vitest';
import { VECTORIZE_DEFAULTS } from '../types/svg.types';
import { applyVectorizeProfile, getVectorizeProfile } from './vectorizeProfiles';

describe('vectorize profiles', () => {
  it('makes clean illustration output less noisy than the balanced profile', () => {
    const clean = getVectorizeProfile('standard', 'clean');
    const balanced = getVectorizeProfile('standard', 'balanced');

    expect(clean.filterSpeckle).toBeGreaterThan(balanced.filterSpeckle);
    expect(clean.layerDifference).toBeGreaterThan(balanced.layerDifference);
  });

  it('makes detailed illustration preserve more source detail than the balanced profile', () => {
    const detailed = getVectorizeProfile('standard', 'detailed');
    const balanced = getVectorizeProfile('standard', 'balanced');

    expect(detailed.filterSpeckle).toBeLessThan(balanced.filterSpeckle);
    expect(detailed.layerDifference).toBeLessThan(balanced.layerDifference);
  });

  it('always produces a valid positive curve-iteration count', () => {
    const settings = applyVectorizeProfile(
      { ...VECTORIZE_DEFAULTS, maxIterations: 0 },
      { detailLevel: 'clean' }
    );

    expect(settings.maxIterations).toBeGreaterThanOrEqual(1);
  });

  it('uses the icon profile when the user switches image type', () => {
    const settings = applyVectorizeProfile(VECTORIZE_DEFAULTS, {
      traceMode: 'icon',
      detailLevel: 'detailed',
    });

    expect(settings.traceMode).toBe('icon');
    expect(settings.filterSpeckle).toBe(1);
    expect(settings.numberofcolors).toBe(8);
  });

  it('restores the illustration color default when switching back from an icon', () => {
    const settings = applyVectorizeProfile(
      { ...VECTORIZE_DEFAULTS, traceMode: 'icon', colorPrecision: 3, numberofcolors: 8 },
      { traceMode: 'standard' }
    );

    expect(settings.numberofcolors).toBe(16);
  });
});
