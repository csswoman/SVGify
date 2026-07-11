'use client';

import { useEffect, useState } from 'react';
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
  PenNib,
  Tag,
  Trash,
  Wrench,
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

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function ToolBar({ activeTool, document, onToolChange }: ToolBarProps) {
  const { t } = useI18n();
  const hasSvg = document.svgString !== null;
  const [shapeOpen, setShapeOpen] = useState(() => isShapeTool(activeTool));

  useEffect(() => {
    if (isShapeTool(activeTool)) setShapeOpen(true);
  }, [activeTool]);

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );

  return (
    <nav
      role="toolbar"
      aria-label={t('workspace.tools')}
      className="flex w-16 shrink-0 flex-col gap-1 overflow-y-auto border-r border-gray-200 bg-white px-1 py-2 dark:border-gray-700 dark:bg-gray-800"
    >
      {visibleGroups.map((group, groupIndex) => {
        const isShape = group.id === 'shape';
        const showTools = !isShape || shapeOpen;
        const isLast = groupIndex === visibleGroups.length - 1;

        return (
          <div
            key={group.id}
            className={[
              'flex flex-col gap-0.5',
              !isLast ? 'mb-1 border-b border-gray-100 pb-2 dark:border-gray-700' : '',
            ].join(' ')}
          >
            {isShape ? (
              <button
                type="button"
                onClick={() => setShapeOpen((open) => !open)}
                aria-expanded={shapeOpen}
                aria-controls="toolbar-shape-tools"
                title={t('tool.group.shape')}
                className={[
                  'focus-ring flex w-full flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1.5 transition',
                  isShapeTool(activeTool)
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <Wrench
                  size={20}
                  weight={isShapeTool(activeTool) ? 'fill' : 'regular'}
                  aria-hidden
                />
                <span
                  className={[
                    'flex items-center gap-0.5 text-[10px] font-medium leading-none',
                    isShapeTool(activeTool)
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300',
                  ].join(' ')}
                >
                  {t('tool.refine')}
                  {shapeOpen ? (
                    <CaretUp size={10} aria-hidden />
                  ) : (
                    <CaretDown size={10} aria-hidden />
                  )}
                </span>
              </button>
            ) : null}

            {showTools && (
              <div
                id={isShape ? 'toolbar-shape-tools' : undefined}
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
            )}
          </div>
        );
      })}
    </nav>
  );
}
