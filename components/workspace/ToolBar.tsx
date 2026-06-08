'use client';

import {
  Cursor,
  Eraser,
  Eyedropper,
  ImageSquare,
  Lightning,
  MagicWand,
  MagnifyingGlass,
  PaintBrush,
  PaintBucket,
  PenNib,
  Tag,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import { isToolEnabled } from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

const TOOL_CONFIG: { id: WorkspaceTool; icon: Icon; shortcut?: string }[] = [
  { id: 'import', icon: ImageSquare },
  { id: 'vectorize', icon: MagicWand },
  { id: 'select', icon: Cursor, shortcut: 'V' },
  { id: 'eyedropper', icon: Eyedropper, shortcut: 'I' },
  { id: 'fill', icon: PaintBucket, shortcut: 'G' },
  { id: 'erase', icon: Eraser, shortcut: 'E' },
  { id: 'brush', icon: PaintBrush, shortcut: 'B' },
  { id: 'nodes', icon: PenNib, shortcut: 'A' },
  { id: 'labels', icon: Tag, shortcut: 'L' },
  { id: 'optimize', icon: Lightning },
  { id: 'zoom', icon: MagnifyingGlass, shortcut: 'Z' },
];

const SEPARATORS_AFTER = new Set<WorkspaceTool>(['import', 'fill', 'labels']);

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function ToolBar({ activeTool, document, onToolChange }: ToolBarProps) {
  const { t } = useI18n();

  return (
    <nav
      role="toolbar"
      aria-label="Tools"
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-white py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {TOOL_CONFIG.map(({ id, icon, shortcut }) => (
        <div key={id} className="flex flex-col items-center gap-1">
          <ToolButton
            icon={icon}
            label={t(`tool.${id}`)}
            shortcut={shortcut}
            active={activeTool === id}
            disabled={!isToolEnabled(id, document)}
            onClick={() => onToolChange(id)}
          />
          {SEPARATORS_AFTER.has(id) && (
            <div className="my-1 h-px w-8 bg-gray-200 dark:bg-gray-700" />
          )}
        </div>
      ))}
    </nav>
  );
}
