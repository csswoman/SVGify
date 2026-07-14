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
  Trash,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import {
  isToolEnabled,
  WORKSPACE_TOOL_GROUPS,
} from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

const TOOL_ICONS: Record<WorkspaceTool, Icon> = {
  import: ImageSquare,
  vectorize: MagicWand,
  eyedropper: Eyedropper,
  fill: PaintBucket,
  erase: Eraser,
  erasePath: Trash,
  brush: PaintBrush,
  nodes: PenNib,
  labels: Tag,
  optimize: Lightning,
};

function isFillMode(tool: WorkspaceTool): boolean {
  return tool === 'fill' || tool === 'eyedropper';
}

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
  /** Quiet discovery cue on Points until the user opens a shape tool. */
  showRefineHint?: boolean;
}

export function ToolBar({
  activeTool,
  document,
  onToolChange,
  showRefineHint = false,
}: ToolBarProps) {
  const { t } = useI18n();
  const hasSvg = document.svgString !== null;
  const fillOpen = isFillMode(activeTool);

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );

  return (
    <nav
      role="toolbar"
      aria-label={t('workspace.tools')}
      className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-gray-200 bg-white py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {visibleGroups.map((group, groupIndex) => {
        const isEdit = group.id === 'edit';
        const isShape = group.id === 'shape';
        const isLast = groupIndex === visibleGroups.length - 1;

        return (
          <div key={group.id} className="flex flex-col items-center gap-1">
            {isEdit ? (
              <div
                role="group"
                aria-label={t('tool.group.edit')}
                className="flex flex-col items-center gap-1"
              >
                <ToolButton
                  icon={PaintBucket}
                  label={t('tool.fill')}
                  shortcut="G"
                  active={activeTool === 'fill'}
                  expanded={activeTool === 'eyedropper' ? true : undefined}
                  disabled={!isToolEnabled('fill', document)}
                  onClick={() => onToolChange('fill')}
                />
                {fillOpen ? (
                  <ToolButton
                    icon={Eyedropper}
                    label={t('tool.eyedropper')}
                    shortcut="I"
                    active={activeTool === 'eyedropper'}
                    disabled={!isToolEnabled('eyedropper', document)}
                    onClick={() => onToolChange('eyedropper')}
                  />
                ) : null}
              </div>
            ) : (
              <div
                role="group"
                aria-label={t(`tool.group.${group.id}`)}
                className="flex flex-col items-center gap-1"
              >
                {group.tools.map(({ id, shortcut }) => (
                  <ToolButton
                    key={id}
                    icon={TOOL_ICONS[id]}
                    label={t(`tool.${id}`)}
                    shortcut={shortcut}
                    active={activeTool === id}
                    badge={isShape && id === 'nodes' && showRefineHint}
                    disabled={!isToolEnabled(id, document)}
                    onClick={() => onToolChange(id)}
                  />
                ))}
              </div>
            )}
            {!isLast ? (
              <div
                className="my-0.5 h-px w-8 shrink-0 bg-gray-200 dark:bg-gray-700"
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
