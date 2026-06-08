export type WorkspaceTool =
  | 'import'
  | 'vectorize'
  | 'select'
  | 'eyedropper'
  | 'fill'
  | 'erase'
  | 'brush'
  | 'nodes'
  | 'labels'
  | 'optimize'
  | 'zoom';

export interface WorkspaceDocument {
  imageData: ImageData | null;
  svgString: string | null;
}

export interface ToolDefinition {
  id: WorkspaceTool;
  icon: string;
  shortcut?: string;
  group: 'file' | 'vectorize' | 'edit' | 'pro' | 'output' | 'view';
}
