import { beforeAll, describe, expect, it } from 'vitest';
import { readSvgViewBox, serializeSvgAtBaseViewBox } from './svgViewBox';

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
});
