import { describe, expect, it } from 'vitest';
import {
  isShapeTool,
  isToolEnabled,
  toolFromKeyboard,
  WORKSPACE_TOOL_GROUPS,
  WORKSPACE_TOOLS,
} from './workspaceTools';
import type { WorkspaceDocument } from '@/types/workspace.types';

const empty: WorkspaceDocument = { imageData: null, svgString: null };
const withImage: WorkspaceDocument = { imageData: {} as ImageData, svgString: null };
const withSvg: WorkspaceDocument = { imageData: {} as ImageData, svgString: '<svg></svg>' };

describe('WORKSPACE_TOOL_GROUPS order', () => {
  it('follows Fill → Refine → Optimize spine', () => {
    expect(WORKSPACE_TOOL_GROUPS.map((g) => g.id)).toEqual([
      'file',
      'edit',
      'shape',
      'output',
    ]);
  });

  it('lists refine tools in constructive order (UI collapses until Points opens)', () => {
    const shape = WORKSPACE_TOOL_GROUPS.find((g) => g.id === 'shape');
    expect(shape?.tools.map((t) => t.id)).toEqual([
      'nodes',
      'brush',
      'erase',
      'erasePath',
      'labels',
    ]);
  });
});

describe('isToolEnabled', () => {
  it('enables import always', () => {
    expect(isToolEnabled('import', empty)).toBe(true);
  });
  it('enables vectorize only with imageData', () => {
    expect(isToolEnabled('vectorize', empty)).toBe(false);
    expect(isToolEnabled('vectorize', withImage)).toBe(true);
  });
  it('enables edit tools only with svgString', () => {
    for (const tool of WORKSPACE_TOOLS) {
      if (tool === 'import' || tool === 'vectorize') continue;
      expect(isToolEnabled(tool, withImage)).toBe(false);
      expect(isToolEnabled(tool, withSvg)).toBe(true);
    }
  });
});

describe('isShapeTool', () => {
  it('marks refine tools only', () => {
    expect(isShapeTool('erase')).toBe(true);
    expect(isShapeTool('labels')).toBe(true);
    expect(isShapeTool('fill')).toBe(false);
    expect(isShapeTool('optimize')).toBe(false);
  });
});

describe('toolFromKeyboard', () => {
  it('maps i/g/e/x/b/a/l to tools', () => {
    expect(toolFromKeyboard('v')).toBeNull();
    expect(toolFromKeyboard('I')).toBe('eyedropper');
    expect(toolFromKeyboard('g')).toBe('fill');
    expect(toolFromKeyboard('e')).toBe('erase');
    expect(toolFromKeyboard('x')).toBe('erasePath');
    expect(toolFromKeyboard('b')).toBe('brush');
    expect(toolFromKeyboard('a')).toBe('nodes');
    expect(toolFromKeyboard('l')).toBe('labels');
    expect(toolFromKeyboard('z')).toBeNull();
  });
  it('returns null for unrelated keys', () => {
    expect(toolFromKeyboard('q')).toBeNull();
  });
});
