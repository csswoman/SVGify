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

const DESKTOP_TOOL_HINT_KEYS: Record<WorkspaceTool, string> = {
  import: 'tool.import.hint',
  vectorize: 'tool.vectorize.hint',
  eyedropper: 'tool.eyedropper.hint',
  fill: 'tool.fill.hint',
  erase: 'tool.erase.hint',
  erasePath: 'tool.erasePath.hint',
  brush: 'tool.brush.hint',
  nodes: 'tool.nodes.hint',
  labels: 'tool.labels.hint',
  optimize: 'tool.optimize.hint',
};

function isFillMode(tool: WorkspaceTool): boolean {
  return tool === 'fill' || tool === 'eyedropper';
}

function isEraseMode(tool: WorkspaceTool): boolean {
  return tool === 'erase' || tool === 'erasePath';
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
  const hasImage = document.imageData !== null;
  const fillOpen = isFillMode(activeTool);
  const shapeOpen = isShapeTool(activeTool);
  const eraseOpen = isEraseMode(activeTool);

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );
  const desktopShapeTools = WORKSPACE_TOOL_GROUPS.find((group) => group.id === 'shape')?.tools ?? [];
  const desktopHint = hasSvg
    ? t(DESKTOP_TOOL_HINT_KEYS[activeTool] as Parameters<typeof t>[0])
    : t('workspace.vectorizeHint');

  const renderDesktopTool = (id: WorkspaceTool, shortcut?: string) => (
    <ToolButton
      key={id}
      icon={TOOL_ICONS[id]}
      label={
        id === 'import' && hasImage
          ? t('workspace.replaceImage')
          : t(`tool.${id}`)
      }
      shortcut={shortcut}
      active={activeTool === id}
      disabled={!isToolEnabled(id, document)}
      badge={id === 'nodes' && showRefineHint}
      mode="row"
      onClick={() => onToolChange(id)}
    />
  );

  return (
    <>
      <nav
        role="toolbar"
        aria-label={t('workspace.tools')}
        className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-gray-200 bg-white py-2 lg:hidden dark:border-gray-700 dark:bg-gray-800"
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
              ) : isShape ? (
                <div
                  role="group"
                  aria-label={t('tool.group.shape')}
                  className="flex flex-col items-center gap-1"
                >
                  <ToolButton
                    icon={PenNib}
                    label={t('tool.nodes')}
                    shortcut="A"
                    active={activeTool === 'nodes'}
                    expanded={shapeOpen && activeTool !== 'nodes' ? true : undefined}
                    badge={showRefineHint && !shapeOpen}
                    disabled={!isToolEnabled('nodes', document)}
                    onClick={() => onToolChange('nodes')}
                  />
                  {shapeOpen ? (
                    <>
                      <ToolButton
                        icon={PaintBrush}
                        label={t('tool.brush')}
                        shortcut="B"
                        active={activeTool === 'brush'}
                        disabled={!isToolEnabled('brush', document)}
                        onClick={() => onToolChange('brush')}
                      />
                      <ToolButton
                        icon={Eraser}
                        label={t('tool.erase')}
                        shortcut="E"
                        active={activeTool === 'erase'}
                        expanded={activeTool === 'erasePath' ? true : undefined}
                        disabled={!isToolEnabled('erase', document)}
                        onClick={() => onToolChange('erase')}
                      />
                      {eraseOpen ? (
                        <ToolButton
                          icon={Trash}
                          label={t('tool.erasePath')}
                          shortcut="X"
                          active={activeTool === 'erasePath'}
                          disabled={!isToolEnabled('erasePath', document)}
                          onClick={() => onToolChange('erasePath')}
                        />
                      ) : null}
                      <ToolButton
                        icon={Tag}
                        label={t('tool.labels')}
                        shortcut="L"
                        active={activeTool === 'labels'}
                        disabled={!isToolEnabled('labels', document)}
                        onClick={() => onToolChange('labels')}
                      />
                    </>
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
                      label={
                        id === 'import' && hasImage
                          ? t('workspace.replaceImage')
                          : t(`tool.${id}`)
                      }
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

      <nav
        aria-label={t('workspace.tools')}
        className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
              {t('workspace.tools')}
            </p>
            {!hasSvg ? (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                {t('workspace.editableSvg')}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {desktopHint}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => {
            const isEdit = group.id === 'edit';
            const isShape = group.id === 'shape';
            const isOutput = group.id === 'output';

            return (
              <section key={group.id} className="space-y-2">
                <div className="px-1">
                  <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {t(`tool.group.${group.id}`)}
                  </h2>
                </div>

                <div className="space-y-1">
                  {group.tools.map(({ id, shortcut }) => renderDesktopTool(id, shortcut))}
                  {isEdit ? renderDesktopTool('eyedropper', 'I') : null}
                  {isShape
                    ? desktopShapeTools
                        .filter(({ id }) => !group.tools.some((tool) => tool.id === id))
                        .map(({ id, shortcut }) => renderDesktopTool(id, shortcut))
                    : null}
                </div>

                {isOutput ? null : (
                  <div className="mx-1 h-px bg-gray-100 dark:bg-gray-700" aria-hidden />
                )}
              </section>
            );
          })}
        </div>
      </nav>
    </>
  );
}
