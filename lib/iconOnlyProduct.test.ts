import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('icon-only product surface', () => {
  it('exposes only standard and icon vectorization modes', () => {
    const settingsPanel = readSource('components/vectorize/VectorizeSettings.tsx');
    const i18n = readSource('lib/i18n.tsx');
    const types = readSource('types/svg.types.ts');

    expect(settingsPanel).not.toContain('VECTORIZE_PRESETS');
    expect(settingsPanel).toContain("setTraceMode('standard')");
    expect(settingsPanel).toContain("setTraceMode('icon')");
    expect(settingsPanel).not.toContain('set.preset');
    expect(i18n).not.toContain('set.preset.logo');
    expect(i18n).not.toContain('set.preset.photo');
    expect(i18n).not.toContain('set.mode.color');
    expect(i18n).not.toContain('set.mode.lineart');
    expect(types).not.toContain('VectorizePreset');
    expect(types).toContain("traceMode: 'standard' | 'icon'");
  });

  it('keeps standard vectorization on the vtracer pipeline', () => {
    const worker = readSource('workers/vectorizer.worker.ts');
    const route = readSource('app/api/vectorize/route.ts');
    const packageJson = readSource('package.json');
    const settingsPanel = readSource('components/vectorize/VectorizeSettings.tsx');

    expect(settingsPanel).toContain('applyVectorizeProfile');
    expect(settingsPanel).not.toContain("t('set.maxIterations')");
    expect(settingsPanel).not.toContain("t('set.spliceThreshold')");
    expect(worker).toContain('getVectorizeEndpoint');
    expect(worker).toContain('/api/vectorize');
    expect(worker).toContain("new CompressionStream('gzip')");
    expect(worker).not.toContain('MAX_VECTORIZE_UPLOAD_DIMENSION');
    expect(worker).not.toContain('fitUploadBudget');
    expect(worker).toContain('applyBilateralFilter');
    expect(worker).toContain('quantizeImageToPalette');
    expect(worker).toContain('smoothQuantizedPalette');
    expect(worker).toContain('paletteForTrace');
    expect(worker).toContain('maxIterations: clampInt(merged.maxIterations, 1, 10)');
    expect(route).toContain("from '@neplex/vectorizer'");
    expect(route).toContain('Hierarchical.Cutout');
    expect(route).toContain('Hierarchical.Stacked');
    expect(route).toContain("settings.traceMode === 'icon'");
    expect(route).toContain('PathSimplifyMode.Spline');
    expect(route).toContain('vectorizeRaw');
    expect(route).toContain('gunzipSync');
    expect(route).toContain('resolveTraceColorPrecision');
    expect(route).toContain('finalizeTracedSvg');
    expect(worker).not.toContain('applyAlphaMask');
    expect(worker).not.toContain('traceIconByColorLayers');
    expect(worker).not.toContain('traceIconColorLayers');
    expect(worker).not.toContain('strokeWidth');
    expect(worker).not.toContain('vectorizeLineart');
    expect(worker).not.toContain('quantizeToDominantPalette');
    expect(worker).not.toContain('normalizeSvgPalette');
    expect(worker).not.toContain('vectortracer');
    expect(packageJson).toContain('@neplex/vectorizer');
    expect(packageJson).not.toContain('vectortracer');
  });

  it('keeps the last SVG visible and cancels stale trace work while settings change', () => {
    const vectorizer = readSource('hooks/useVectorizer.ts');
    const session = readSource('hooks/useVectorizeSession.ts');

    expect(vectorizer).toContain('svg: prev.svg');
    expect(session).toContain('cancel();');
  });
});
