import { beforeAll, describe, expect, it } from 'vitest';
import {
  centeredZoomOffset,
  clampZoomOffset,
  readSvgViewBox,
  serializeSvgAtBaseViewBox,
  zoomOffsetPreservingCenter,
} from './svgViewBox';

class TestSVGElement {
  viewBox = { baseVal: { x: 0, y: 0, width: 100, height: 80 } };
  private attrs = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
    if (name === 'viewBox') {
      const parts = value.split(/\s+/).map(Number);
      this.viewBox.baseVal = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
}

beforeAll(() => {
  if (typeof XMLSerializer === 'undefined') {
    Object.defineProperty(globalThis, 'XMLSerializer', {
      value: class {
        serializeToString(node: TestSVGElement) {
          const vb = node.getAttribute('viewBox') ?? '0 0 0 0';
          return `<svg viewBox="${vb}"></svg>`;
        }
      },
    });
  }
});

describe('svgViewBox helpers', () => {
  it('serializes with the baseline viewBox even when the live svg is zoomed', () => {
    const svg = new TestSVGElement() as unknown as SVGSVGElement;
    svg.setAttribute('viewBox', '10 20 40 30');

    const serialized = serializeSvgAtBaseViewBox(svg, { x: 0, y: 0, w: 100, h: 80 });

    expect(serialized).toContain('viewBox="0 0 100 80"');
    expect(svg.getAttribute('viewBox')).toBe('10 20 40 30');
  });

  it('reads the current svg viewBox', () => {
    const svg = new TestSVGElement() as unknown as SVGSVGElement;
    svg.setAttribute('viewBox', '0 0 64 64');

    expect(readSvgViewBox(svg)).toEqual({ x: 0, y: 0, w: 64, h: 64 });
  });

  it('centers the zoom window when scale is below 1', () => {
    const base = { x: 0, y: 0, w: 100, h: 80 };

    expect(centeredZoomOffset(base, 0.8)).toEqual({ x: -12.5, y: -10 });
  });

  it('centers the zoom window when scale is above 1', () => {
    const base = { x: 0, y: 0, w: 100, h: 80 };

    expect(centeredZoomOffset(base, 2)).toEqual({ x: 25, y: 20 });
  });

  it('preserves the viewport center when zooming in', () => {
    const base = { x: 0, y: 0, w: 100, h: 80 };
    const panned = { x: 30, y: 20 };

    expect(zoomOffsetPreservingCenter(base, 2, 4, panned)).toEqual({ x: 42.5, y: 30 });
  });

  it('clamps pan offsets for zoomed-out and zoomed-in windows', () => {
    const base = { x: 0, y: 0, w: 100, h: 80 };

    expect(clampZoomOffset(base, 0.8, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(clampZoomOffset(base, 0.8, -30, -30)).toEqual({ x: -25, y: -20 });
    expect(clampZoomOffset(base, 2, 100, 100)).toEqual({ x: 50, y: 40 });
  });
});
