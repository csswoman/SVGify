import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
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
    hierarchical: settings.traceMode === 'icon' ? Hierarchical.Cutout : Hierarchical.Stacked,
    mode: settings.traceMode === 'icon' ? PathSimplifyMode.Polygon : PathSimplifyMode.Spline,
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

async function loadFixtureRgba(fixturePath: string) {
  const fixture = await readFile(fixturePath);
  return sharp(fixture).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function traceFixture(
  fixturePath: string,
  traceMode: VectorizeSettings['traceMode'],
  detailLevel: VectorizeSettings['detailLevel']
) {
  const startedAt = performance.now();
  const decoded = await loadFixtureRgba(fixturePath);
  const settings = applyVectorizeProfile(VECTORIZE_DEFAULTS, {
    traceMode,
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
    colorCount: new Set(svg.match(/(?:fill|stroke)="[^"]+"/g) ?? []).size,
    byteSize: Buffer.byteLength(svg),
    elapsedMs: Math.round(performance.now() - startedAt),
    hash: createHash('sha256').update(svg).digest('hex').slice(0, 12),
  };
}

function reportFixtureMetrics(name: string, result: Awaited<ReturnType<typeof traceFixture>>) {
  if (process.env.VECTORIZE_PROFILE_REPORT !== '1') return;
  console.info(JSON.stringify({ fixture: name, ...result, svg: undefined }));
}

describe('vectorize profile fixture', () => {
  it('traces the svgify icon successfully at every detail level', async () => {
    const fixturePath = join(process.cwd(), 'public', 'svgify.svg');
    const [clean, balanced, detailed] = await Promise.all([
      traceFixture(fixturePath, 'icon', 'clean'),
      traceFixture(fixturePath, 'icon', 'balanced'),
      traceFixture(fixturePath, 'icon', 'detailed'),
    ]);

    for (const result of [clean, balanced, detailed]) {
      expect(result.svg).toContain('<svg');
      expect(result.pathCount).toBeGreaterThan(0);
    }

    expect(clean.pathCount).toBeLessThanOrEqual(detailed.pathCount);
    reportFixtureMetrics('svgify-clean', clean);
    reportFixtureMetrics('svgify-balanced', balanced);
    reportFixtureMetrics('svgify-detailed', detailed);
  }, 30_000);

  it('traces illustration, noisy-photo-like, and transparent fixtures in illustration mode', async () => {
    const fixtures = ['illustration.svg', 'noisy-photo-like.svg', 'transparent-halo.svg'];
    const results = await Promise.all(
      fixtures.map((fixture) =>
        traceFixture(join(process.cwd(), 'test', 'fixtures', 'vectorize', fixture), 'standard', 'balanced')
      )
    );

    for (const [index, result] of results.entries()) {
      expect(result.svg).toContain('<svg');
      expect(result.pathCount).toBeGreaterThan(0);
      reportFixtureMetrics(fixtures[index], result);
    }
  }, 30_000);
});
