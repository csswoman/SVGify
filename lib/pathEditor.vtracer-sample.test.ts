import { describe, expect, it } from 'vitest';
import { ColorMode, Hierarchical, PathSimplifyMode, vectorizeRaw } from '@neplex/vectorizer';
import { optimizeSvg } from './optimizeSvg';
import { getEditableNodes, parsePathD } from './pathEditor';

function makeCircleRgba(size: number): { buffer: Buffer; width: number; height: number } {
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(width * height * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
      if (inside) {
        buffer[i] = 255;
        buffer[i + 1] = 220;
        buffer[i + 2] = 0;
        buffer[i + 3] = 255;
      } else {
        buffer[i + 3] = 0;
      }
    }
  }

  return { buffer, width, height };
}

describe('vtracer path commands vs node parser', () => {
  it('node anchors align with browser-rendered spline paths', async () => {
    const { buffer, width, height } = makeCircleRgba(64);
    const rawSvg = await vectorizeRaw(
      buffer,
      { width, height },
      {
        colorMode: ColorMode.Color,
        hierarchical: Hierarchical.Stacked,
        mode: PathSimplifyMode.Spline,
        colorPrecision: 4,
        filterSpeckle: 2,
        cornerThreshold: 60,
        pathPrecision: 2,
        layerDifference: 16,
        lengthThreshold: 4,
        maxIterations: 4,
        spliceThreshold: 45,
      }
    );

    const svg = optimizeSvg(rawSvg, {
      removeStroke: true,
      mergePaths: false,
      splitCompoundPaths: true,
    });

    const paths = [...svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);

    for (const d of paths) {
      const nodes = getEditableNodes(parsePathD(d));
      expect(nodes.length, `failed to parse anchors for ${d.slice(0, 120)}`).toBeGreaterThan(2);
      for (const node of nodes) {
        expect(Number.isFinite(node.x), `x not finite in ${d.slice(0, 120)}`).toBe(true);
        expect(Number.isFinite(node.y), `y not finite in ${d.slice(0, 120)}`).toBe(true);
      }
    }
  });
});
