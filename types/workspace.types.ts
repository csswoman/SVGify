export type WorkspaceTool =
  | 'import'
  | 'vectorize'
  | 'eyedropper'
  | 'fill'
  | 'erase'
  | 'erasePath'
  | 'brush'
  | 'nodes'
  | 'labels'
  | 'optimize';

export interface WorkspaceDocument {
  imageData: ImageData | null;
  svgString: string | null;
}

export type WorkspaceExportStatus =
  | 'no_document'
  | 'not_prepared'
  | 'prepared_current'
  | 'prepared_stale';

export interface ToolDefinition {
  id: WorkspaceTool;
  icon: string;
  shortcut?: string;
  group: 'file' | 'vectorize' | 'edit' | 'pro' | 'output' | 'view';
}
