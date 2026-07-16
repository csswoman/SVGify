import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  ColorMode,
  Hierarchical,
  PathSimplifyMode,
  vectorizeRaw,
  type Config as VTracerConfig,
} from '@neplex/vectorizer';
import { describe, expect, it } from 'vitest';
import { VECTORIZE_DEFAULTS, type VectorizeSettings } from '../types/svg.types';
import { applyVectorizeProfile } from './vectorizeProfiles';

function profileConfig(settings: VectorizeSettings): VTracerConfig {
  return {
    colorMode: ColorMode.Color,
    hierarchical: Hierarchical.Cutout,
    mode: PathSimplifyMode.Polygon,
    colorPrecision: settings.colorPrecision,
    filterSpeckle: settings.filterSpeckle,
    cornerThreshold: settings.cornerThreshold,
    pathPrecision: settings.pathPrecision,
    layerDifference: settings.layerDifference,
    lengthThreshold: settings.lengthThreshold,
    maxIterations: settings.maxIterations,
    spliceThreshold: settings.spliceThreshold,
    smallCircle: 16,
  };
}

async function traceFixture(detailLevel: VectorizeSettings['detailLevel']) {
  const fixture = await readFile(join(process.cwd(), 'public', 'validation-icon.png'));
  const decoded = await sharp(fixture).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const settings = applyVectorizeProfile(VECTORIZE_DEFAULTS, {
    traceMode: 'icon',
    detailLevel,
  });
  const svg = await vectorizeRaw(
    decoded.data,
    { width: decoded.info.width, height: decoded.info.height },
    profileConfig(settings)
  );

  return {
    svg,
    pathCount: (svg.match(/<path\b/g) ?? []).length,
  };
}

describe('vectorize profile fixture', () => {
  it('traces the validation icon successfully at every detail level', async () => {
    const [clean, balanced, detailed] = await Promise.all([
      traceFixture('clean'),
      traceFixture('balanced'),
      traceFixture('detailed'),
    ]);

    for (const result of [clean, balanced, detailed]) {
      expect(result.svg).toContain('<svg');
      expect(result.pathCount).toBeGreaterThan(0);
    }

    expect(clean.pathCount).toBeLessThanOrEqual(detailed.pathCount);
  }, 30_000);
});
