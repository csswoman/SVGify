'use client';

import { PathList, type PathItem } from '@/components/shape/PathList';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import {
  inspectorLabelStrong,
  inspectorRange,
} from '@/components/workspace/inspectorChrome';

interface EraseInspectorProps {
  mode: 'brush' | 'path';
  pathItems: PathItem[];
  eraseSize: number;
  onHover: (el: SVGPathElement | null) => void;
  onDelete: (item: PathItem) => void;
  onEraseSizeChange: (size: number) => void;
}

export function EraseInspector({
  mode,
  pathItems,
  eraseSize,
  onHover,
  onDelete,
  onEraseSizeChange,
}: EraseInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 space-y-3">
        <InspectorHeader
          title={mode === 'brush' ? t('tool.erase') : t('tool.erasePath')}
          subtitle={mode === 'brush' ? t('shape.eraseBrushSub') : t('shape.erasePathSub')}
        />
        {mode === 'brush' ? (
          <div>
            <label className={inspectorLabelStrong}>
              {t('shape.brushSize')}: <span className="ml-1 font-mono">{eraseSize}</span>
              <Tooltip text={t('shape.eraseBrush.help')} label={t('shape.brushSize')} />
            </label>
            <input
              type="range"
              min={2}
              max={64}
              step={1}
              value={eraseSize}
              onChange={(e) => onEraseSizeChange(Number(e.target.value))}
              className={inspectorRange}
              aria-label={`${t('shape.brushSize')}: ${eraseSize}`}
            />
          </div>
        ) : null}
        <p className="flex items-center text-xs font-semibold text-ink-muted dark:text-dark-ink-muted">
          {t('shape.shapes')} ({pathItems.length})
          <Tooltip text={t('shape.list.help')} label={t('shape.shapes')} />
        </p>
      </div>
      <PathList items={pathItems} onHover={onHover} onDelete={onDelete} />
    </div>
  );
}
