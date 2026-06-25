'use client';

import {
  Eraser,
  Eyedropper,
  ImageSquare,
  Lightning,
  MagicWand,
  PaintBrush,
  PaintBucket,
  PenNib,
  Tag,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import { isToolEnabled, WORKSPACE_TOOL_GROUPS } from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

const TOOL_ICONS: Record<WorkspaceTool, Icon> = {
  import: ImageSquare,
  vectorize: MagicWand,
  eyedropper: Eyedropper,
  fill: PaintBucket,
  erase: Eraser,
  brush: PaintBrush,
  nodes: PenNib,
  labels: Tag,
  optimize: Lightning,
};

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function ToolBar({ activeTool, document, onToolChange }: ToolBarProps) {
  const { t } = useI18n();
  const hasSvg = document.svgString !== null;

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );

  return (
    <nav
      role="toolbar"
      aria-label={t('workspace.tools')}
      className="flex w-14 shrink-0 flex-col gap-2 overflow-y-auto border-r border-gray-200 bg-white px-1.5 py-3 lg:w-44 lg:gap-3 lg:px-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {visibleGroups.map((group, groupIndex) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          <span
            className="hidden px-1 text-[10px] font-medium text-gray-500 lg:block dark:text-gray-400"
            id={`tool-group-${group.id}`}
          >
            {t(`tool.group.${group.id}`)}
          </span>
          <div
            role="group"
            aria-label={t(`tool.group.${group.id}`)}
            className="flex flex-col gap-0.5"
          >
            {group.tools.map(({ id, shortcut }) => (
              <ToolButton
                key={id}
                icon={TOOL_ICONS[id]}
                label={t(`tool.${id}`)}
                shortcut={shortcut}
                active={activeTool === id}
                disabled={!isToolEnabled(id, document)}
                onClick={() => onToolChange(id)}
              />
            ))}
          </div>
          {groupIndex < visibleGroups.length - 1 && (
            <div className="mt-2 h-px bg-gray-100 dark:bg-gray-700" aria-hidden />
          )}
        </div>
      ))}
      {!hasSvg && (
        <p className="hidden px-1 text-[10px] leading-snug text-gray-500 lg:block dark:text-gray-400">
          {t('workspace.moreToolsAfterVectorize')}
        </p>
      )}
    </nav>
  );
}
