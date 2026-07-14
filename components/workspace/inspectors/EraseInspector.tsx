'use client';

import { PathList, type PathItem } from '@/components/shape/PathList';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {mode === 'brush' ? t('tool.erase') : t('tool.erasePath')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mode === 'brush' ? t('shape.eraseBrushSub') : t('shape.erasePathSub')}
        </p>
      </div>
      {mode === 'brush' && (
        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
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
            className="w-full accent-blue-600"
            aria-label={`${t('shape.brushSize')}: ${eraseSize}`}
          />
        </div>
      )}
      <p className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
        {t('shape.shapes')} ({pathItems.length})
        <Tooltip text={t('shape.list.help')} label={t('shape.shapes')} />
      </p>
      <PathList items={pathItems} onHover={onHover} onDelete={onDelete} />
    </div>
  );
}
