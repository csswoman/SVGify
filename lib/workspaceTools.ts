import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

export type ToolGroupId = 'file' | 'edit' | 'shape' | 'output' | 'view';

export interface WorkspaceToolMeta {
  id: WorkspaceTool;
  shortcut?: string;
}

export interface WorkspaceToolGroup {
  id: ToolGroupId;
  tools: WorkspaceToolMeta[];
  /** Hidden until the document has a traced SVG. */
  requiresSvg: boolean;
}

export const WORKSPACE_TOOL_GROUPS: WorkspaceToolGroup[] = [
  {
    id: 'file',
    requiresSvg: false,
    tools: [{ id: 'import' }, { id: 'vectorize' }],
  },
  {
    id: 'edit',
    requiresSvg: true,
    tools: [
      { id: 'eyedropper', shortcut: 'I' },
      { id: 'fill', shortcut: 'G' },
    ],
  },
  {
    id: 'shape',
    requiresSvg: true,
    tools: [
      { id: 'erase', shortcut: 'E' },
      { id: 'brush', shortcut: 'B' },
      { id: 'nodes', shortcut: 'A' },
      { id: 'labels', shortcut: 'L' },
    ],
  },
  {
    id: 'output',
    requiresSvg: true,
    tools: [{ id: 'optimize' }],
  },
  {
    id: 'view',
    requiresSvg: true,
    tools: [{ id: 'zoom', shortcut: 'Z' }],
  },
];

export const WORKSPACE_TOOLS: WorkspaceTool[] = WORKSPACE_TOOL_GROUPS.flatMap((g) =>
  g.tools.map((t) => t.id)
);

const SVG_TOOLS = new Set<WorkspaceTool>(
  WORKSPACE_TOOLS.filter((t) => t !== 'import' && t !== 'vectorize')
);

const KEY_MAP: Record<string, WorkspaceTool> = {
  i: 'eyedropper', g: 'fill', e: 'erase',
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
