import { describe, expect, it } from 'vitest';
import { VECTORIZE_DEFAULTS, VECTORIZE_PRODUCT_DEFAULTS } from '../types/svg.types';
import { applyVectorizeProfile, getVectorizeProfile } from './vectorizeProfiles';

describe('vectorize profiles', () => {
  it('keeps engine-only controls out of the persisted product settings', () => {
    expect(VECTORIZE_PRODUCT_DEFAULTS).not.toHaveProperty('filterSpeckle');
    expect(VECTORIZE_PRODUCT_DEFAULTS).not.toHaveProperty('pathPrecision');

    const resolved = applyVectorizeProfile(VECTORIZE_PRODUCT_DEFAULTS);

    expect(resolved.filterSpeckle).toBe(VECTORIZE_DEFAULTS.filterSpeckle);
    expect(resolved.pathPrecision).toBe(VECTORIZE_DEFAULTS.pathPrecision);
  });

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
    const settings = applyVectorizeProfile(VECTORIZE_DEFAULTS, { detailLevel: 'clean' });

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

  it('turns the color choice into a matching trace count and automatic merge ceiling', () => {
    const settings = applyVectorizeProfile(
      { ...VECTORIZE_DEFAULTS, colorPrecision: 6, numberofcolors: 64 },
      { detailLevel: 'balanced' }
    );

    expect(settings.numberofcolors).toBe(64);
    expect(settings.paletteMergeThreshold).toBe(12);
  });
});
