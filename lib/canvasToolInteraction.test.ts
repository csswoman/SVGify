import { describe, expect, it } from 'vitest';
import {
  getToolCursor,
  parsePathFill,
  routePathClick,
  type PathClickContext,
} from './canvasToolInteraction';
import type { RGBColor } from '@/types/svg.types';

function mockPath(fill: string): SVGPathElement {
  return { getAttribute: (name: string) => (name === 'fill' ? fill : null) } as SVGPathElement;
}

const red: RGBColor = { r: 255, g: 0, b: 0 };
const blue: RGBColor = { r: 0, g: 0, b: 255 };

describe('parsePathFill', () => {
  it('parses rgb fill', () => {
    expect(parsePathFill(mockPath('rgb(255, 0, 0)'))).toEqual(red);
  });
  it('returns null for missing fill', () => {
    expect(parsePathFill(mockPath('none'))).toBeNull();
  });
});

describe('routePathClick', () => {
  const baseCtx: PathClickContext = {
    fillColor: blue,
    selectedColor: null,
    replaceColor: () => {},
    pushSnapshot: () => {},
    removePath: () => {},
    setSelectedColor: () => {},
    setSelectedPath: () => {},
    setEditingLabelPath: () => {},
  };

  it('eyedropper sets selected color', () => {
    let picked: RGBColor | null = null;
    routePathClick('eyedropper', mockPath('rgb(255, 0, 0)'), {
      ...baseCtx,
      setSelectedColor: (c) => { picked = c; },
    });
    expect(picked).toEqual(red);
  });

  it('fill replaces when colors differ', () => {
    let replaced = false;
    routePathClick('fill', mockPath('rgb(255, 0, 0)'), {
      ...baseCtx,
      replaceColor: (from, to) => {
        replaced = from.r === 255 && to.b === 255;
      },
      pushSnapshot: () => {},
    });
    expect(replaced).toBe(true);
  });

  it('fill no-ops when same color', () => {
    let snapshotted = false;
    routePathClick('fill', mockPath('rgb(0, 0, 255)'), {
      ...baseCtx,
      pushSnapshot: () => { snapshotted = true; },
    });
    expect(snapshotted).toBe(false);
  });

  it('erase removes path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let removed: SVGPathElement | null = null;
    routePathClick('erase', path, {
      ...baseCtx,
      removePath: (p) => { removed = p; },
      pushSnapshot: () => {},
    });
    expect(removed).toBe(path);
  });

  it('nodes selects path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let selected: SVGPathElement | null = null;
    routePathClick('nodes', path, {
      ...baseCtx,
      setSelectedPath: (p) => { selected = p; },
    });
    expect(selected).toBe(path);
  });

  it('labels sets editing path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let editing: SVGPathElement | null = null;
    routePathClick('labels', path, {
      ...baseCtx,
      setEditingLabelPath: (p) => { editing = p; },
    });
    expect(editing).toBe(path);
  });
});

describe('getToolCursor', () => {
  it('returns crosshair for eyedropper', () => {
    expect(getToolCursor('eyedropper')).toBe('crosshair');
  });
  it('returns cell for fill', () => {
    expect(getToolCursor('fill')).toBe('cell');
  });
});
