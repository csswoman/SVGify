import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression: gateUntilPrepared on the navbar DownloadButton was added,
 * removed in 64a5971 / 56b7efa, then reintroduced — leaving Download SVG
 * disabled until Prepare even when a payload exists.
 */
describe('TopBar download button', () => {
  it('does not gate navbar download until prepare', () => {
    const src = readFileSync(
      join(__dirname, '../components/workspace/TopBar.tsx'),
      'utf8'
    );
    const downloadCall = src.match(/<DownloadButton[\s\S]*?\/>/);
    expect(downloadCall?.[0]).toBeTruthy();
    expect(downloadCall?.[0]).not.toMatch(/\bgateUntilPrepared\b/);
  });
});
