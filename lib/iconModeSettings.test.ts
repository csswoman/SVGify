import { describe, expect, it } from 'vitest';
import {
  ICON_MODE_SETTINGS,
  resolveTraceColorPrecision,
  resolveTraceSmallCircle,
  shouldPreserveIconPalette,
} from './iconModeSettings';
import type { VectorizeSettings } from '../types/svg.types';
import { VECTORIZE_DEFAULTS } from '../types/svg.types';

describe('icon mode settings', () => {
  it('uses enough color precision so light fills are not collapsed by VTracer', () => {
    // colorPrecision 2 (4 colors) collapses light pink fills into neighboring purples.
    expect(ICON_MODE_SETTINGS.colorPrecision).toBeGreaterThanOrEqual(3);
    expect(ICON_MODE_SETTINGS.numberofcolors).toBe(2 ** ICON_MODE_SETTINGS.colorPrecision);
  });

  it('keeps merge threshold below light-pink↔near-white distance (~52)', () => {
    expect(ICON_MODE_SETTINGS.paletteMergeThreshold).toBeLessThanOrEqual(40);
  });

  it('uses a detail-preserving spline profile for straight logo geometry', () => {
    expect(ICON_MODE_SETTINGS.filterSpeckle).toBeLessThanOrEqual(4);
    expect(ICON_MODE_SETTINGS.cornerThreshold).toBeLessThanOrEqual(60);
    expect(ICON_MODE_SETTINGS.lengthThreshold).toBeLessThanOrEqual(5);
    expect(ICON_MODE_SETTINGS.maxIterations).toBeLessThanOrEqual(2);
    expect(ICON_MODE_SETTINGS.spliceThreshold).toBeLessThanOrEqual(45);
    expect(ICON_MODE_SETTINGS.pathPrecision).toBeGreaterThanOrEqual(2);
  });

  it('rounds small icon clusters without changing standard tracing', () => {
    expect(resolveTraceSmallCircle('icon')).toBe(16);
    expect(resolveTraceSmallCircle('standard')).toBeUndefined();
  });

  it('forces full VTracer precision when an icon palette is already posterized', () => {
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'icon',
      colorPrecision: 3,
      customPalette: [
        { r: 80, g: 27, b: 86 },
        { r: 253, g: 175, b: 219 },
      ],
    };
    expect(shouldPreserveIconPalette(settings)).toBe(true);
    expect(resolveTraceColorPrecision(settings)).toBe(8);
  });

  it('does not force precision 8 in standard mode', () => {
    const settings: VectorizeSettings = {
      ...VECTORIZE_DEFAULTS,
      traceMode: 'standard',
      colorPrecision: 4,
      customPalette: [{ r: 253, g: 175, b: 219 }],
    };
    expect(resolveTraceColorPrecision(settings)).toBe(4);
  });
});
