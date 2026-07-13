'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CaretDown,
  CaretUp,
  Eraser,
  Eyedropper,
  ImageSquare,
  Lightning,
  MagicWand,
  PaintBrush,
  PaintBucket,
  Path,
  PenNib,
  Tag,
  Trash,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import {
  isShapeTool,
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

const REFINE_ENTRY_TOOL: WorkspaceTool = 'erase';
const REFINE_EXIT_TOOL: WorkspaceTool = 'fill';

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
  /** Soft cue until the user opens Refine at least once. */
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
  const refineOpen = isShapeTool(activeTool);
  const [refineMoreOpen, setRefineMoreOpen] = useState(false);

  const lastShapeTool = useRef<WorkspaceTool>(REFINE_ENTRY_TOOL);
  const lastPrimaryTool = useRef<WorkspaceTool>(REFINE_EXIT_TOOL);

  useEffect(() => {
    if (isShapeTool(activeTool)) {
      lastShapeTool.current = activeTool;
      return;
    }
    setRefineMoreOpen(false);
    if (activeTool !== 'import') {
      lastPrimaryTool.current = activeTool;
    }
  }, [activeTool]);

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );

  const toggleRefine = () => {
    if (refineOpen) {
      const exit = lastPrimaryTool.current;
      onToolChange(isToolEnabled(exit, document) ? exit : REFINE_EXIT_TOOL);
      return;
    }
    const entry = lastShapeTool.current;
    onToolChange(isToolEnabled(entry, document) ? entry : REFINE_ENTRY_TOOL);
  };

  return (
    <nav
      role="toolbar"
      aria-label={t('workspace.tools')}
      className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-gray-200 bg-white py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {visibleGroups.map((group, groupIndex) => {
        const isShape = group.id === 'shape';
        const isEdit = group.id === 'edit';
        const fillOpen = isFillMode(activeTool);
        const isLast = groupIndex === visibleGroups.length - 1;
        const primaryShapeId = isShapeTool(activeTool)
          ? activeTool
          : lastShapeTool.current;
        const moreShapeTools = group.tools.filter(({ id }) => id !== primaryShapeId);

        return (
          <div key={group.id} className="flex flex-col items-center gap-1">
            {isShape ? (
              <div
                role="group"
                aria-label={t('tool.group.shape')}
                className="flex flex-col items-center gap-1"
              >
                <ToolButton
                  icon={Path}
                  label={
                    refineOpen ? t('tool.refine.exit') : t('tool.refine')
                  }
                  expanded={refineOpen}
                  badge={showRefineHint && !refineOpen}
                  disabled={!isToolEnabled(REFINE_ENTRY_TOOL, document)}
                  onClick={toggleRefine}
                />
                {refineOpen ? (
                  <>
                    <ToolButton
                      icon={TOOL_ICONS[primaryShapeId]}
                      label={t(`tool.${primaryShapeId}`)}
                      shortcut={
                        group.tools.find((tool) => tool.id === primaryShapeId)?.shortcut
                      }
                      active={activeTool === primaryShapeId}
                      disabled={!isToolEnabled(primaryShapeId, document)}
                      onClick={() => onToolChange(primaryShapeId)}
                    />
                    <ToolButton
                      icon={refineMoreOpen ? CaretUp : CaretDown}
                      label={t('tool.refine.more')}
                      expanded={refineMoreOpen}
                      onClick={() => setRefineMoreOpen((open) => !open)}
                    />
                    {refineMoreOpen
                      ? moreShapeTools.map(({ id, shortcut }) => (
                          <ToolButton
                            key={id}
                            icon={TOOL_ICONS[id]}
                            label={t(`tool.${id}`)}
                            shortcut={shortcut}
                            active={activeTool === id}
                            disabled={!isToolEnabled(id, document)}
                            onClick={() => onToolChange(id)}
                          />
                        ))
                      : null}
                  </>
                ) : null}
              </div>
            ) : isEdit ? (
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
