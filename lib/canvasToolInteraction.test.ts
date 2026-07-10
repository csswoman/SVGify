import { describe, expect, it } from 'vitest';
import {
  getToolCursor,
  parsePathFill,
  resolvePathFromEvent,
  routePathClick,
  type PathClickContext,
} from './canvasToolInteraction';
import type { RGBColor } from '@/types/svg.types';

function mockPath(fill: string): SVGPathElement {
  return {
    getAttribute: (name: string) => (name === 'fill' ? fill : null),
    setAttribute: () => {},
  } as unknown as SVGPathElement;
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
  it('parses hex fill', () => {
    expect(parsePathFill(mockPath('#ff0000'))).toEqual(red);
  });
});

describe('routePathClick', () => {
  const baseCtx: PathClickContext = {
    fillColor: blue,
    selectedColor: null,
    replacePathColor: () => {},
    pushSnapshot: () => {},
    removePath: () => {},
    erasePathArea: () => {},
    setSelectedColor: () => {},
    setFillColor: () => {},
    setSelectedPath: () => {},
    setEditingLabelPath: () => {},
  };

  it('eyedropper sets selected and fill color, then returns to fill', () => {
    let picked: RGBColor | null = null;
    let fill: RGBColor | null = null;
    let nextTool = '';
    routePathClick('eyedropper', mockPath('rgb(255, 0, 0)'), {
      ...baseCtx,
      setSelectedColor: (c) => { picked = c; },
      setFillColor: (c) => { fill = c; },
      onToolChange: (tool) => { nextTool = tool; },
    });
    expect(picked).toEqual(red);
    expect(fill).toEqual(red);
    expect(nextTool).toBe('fill');
  });

  it('fill paints only the clicked path when colors differ', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let painted = false;
    routePathClick('fill', path, {
      ...baseCtx,
      replacePathColor: (target, to, from) => {
        painted = target === path && from.r === 255 && to.b === 255;
      },
      pushSnapshot: () => {},
    });
    expect(painted).toBe(true);
  });

  it('fill no-ops when same color', () => {
    let snapshotted = false;
    routePathClick('fill', mockPath('rgb(0, 0, 255)'), {
      ...baseCtx,
      pushSnapshot: () => { snapshotted = true; },
    });
    expect(snapshotted).toBe(false);
  });

  it('erasePath masks the clicked path area', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let erased: SVGPathElement | null = null;
    routePathClick('erasePath', path, {
      ...baseCtx,
      erasePathArea: (p) => { erased = p; },
      pushSnapshot: () => {},
    }, { clientX: 1, clientY: 1 });
    expect(erased).toBe(path);
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

  it('nodes selects path without fill', () => {
    const path = mockPath('none');
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

describe('resolvePathFromEvent', () => {
  it('selects the path that received the click, even when a smaller shape overlaps it', () => {
    class TestElement {
      closest(selector: string) {
        if (selector === 'path') return this;
        return null;
      }
    }

    class TestPath extends TestElement {
      constructor(private readonly area: number) {
        super();
      }

      getBBox() {
        return { width: this.area, height: 1 };
      }
    }

    const previousElement = globalThis.Element;
    const previousPath = globalThis.SVGPathElement;
    const previousDocument = globalThis.document;
    globalThis.Element = TestElement as unknown as typeof Element;
    globalThis.SVGPathElement = TestPath as unknown as typeof SVGPathElement;

    const large = new TestPath(1000) as unknown as SVGPathElement;
    const small = new TestPath(10) as unknown as SVGPathElement;
    const container = {
      contains: (el: Element) => el === large || el === small,
    } as unknown as HTMLElement;

    globalThis.document = {
      elementsFromPoint: () => [large, small],
    } as unknown as Document;

    try {
      expect(resolvePathFromEvent(large, container, { clientX: 1, clientY: 1 })).toBe(large);
    } finally {
      globalThis.Element = previousElement;
      globalThis.SVGPathElement = previousPath;
      globalThis.document = previousDocument;
    }
  });
});
