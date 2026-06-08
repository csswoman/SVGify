import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('icon-only product surface', () => {
  it('does not expose removed vectorization modes or presets in the settings UI', () => {
    const settingsPanel = readSource('components/vectorize/VectorizeSettings.tsx');
    const i18n = readSource('lib/i18n.tsx');
    const types = readSource('types/svg.types.ts');

    expect(settingsPanel).not.toContain('VECTORIZE_PRESETS');
    expect(settingsPanel).not.toContain('settings.mode');
    expect(settingsPanel).not.toContain('set.mode');
    expect(settingsPanel).not.toContain('set.preset');
    expect(i18n).not.toContain('set.preset.logo');
    expect(i18n).not.toContain('set.preset.photo');
    expect(i18n).not.toContain('set.mode.color');
    expect(i18n).not.toContain('set.mode.lineart');
    expect(types).not.toContain('VectorizePreset');
    expect(types).not.toContain("mode: 'icon' | 'color' | 'lineart'");
  });

  it('keeps the worker on a single icon pipeline', () => {
    const worker = readSource('workers/vectorizer.worker.ts');
    const packageJson = readSource('package.json');

    expect(worker).toContain('settings.customPalette');
    expect(worker).toContain('applyAlphaMask');
    expect(worker).not.toContain('traceIconColorLayers');
    expect(worker).not.toContain("options.mode");
    expect(worker).not.toContain("mode ===");
    expect(worker).not.toContain('vectorizeLineart');
    expect(worker).not.toContain('quantizeToDominantPalette');
    expect(worker).not.toContain('normalizeSvgPalette');
    expect(worker).not.toContain('vectortracer');
    expect(packageJson).not.toContain('vectortracer');
  });
});
