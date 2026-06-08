import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

export const WORKSPACE_TOOLS: WorkspaceTool[] = [
  'import', 'vectorize', 'select', 'eyedropper', 'fill',
  'erase', 'brush', 'nodes', 'labels', 'optimize', 'zoom',
];

const SVG_TOOLS = new Set<WorkspaceTool>(
  WORKSPACE_TOOLS.filter((t) => t !== 'import' && t !== 'vectorize')
);

const KEY_MAP: Record<string, WorkspaceTool> = {
  v: 'select', i: 'eyedropper', g: 'fill', e: 'erase',
  b: 'brush', a: 'nodes', l: 'labels', z: 'zoom',
};

export function isToolEnabled(tool: WorkspaceTool, doc: WorkspaceDocument): boolean {
  if (tool === 'import') return true;
  if (tool === 'vectorize') return doc.imageData !== null;
  return doc.svgString !== null && SVG_TOOLS.has(tool);
}

export function toolFromKeyboard(key: string): WorkspaceTool | null {
  return KEY_MAP[key.toLowerCase()] ?? null;
}
