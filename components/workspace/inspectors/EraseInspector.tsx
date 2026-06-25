'use client';

import { PathList, type PathItem } from '@/components/shape/PathList';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface EraseInspectorProps {
  pathItems: PathItem[];
  onHover: (el: SVGPathElement | null) => void;
  onDelete: (item: PathItem) => void;
}

export function EraseInspector({ pathItems, onHover, onDelete }: EraseInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.erase')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('shape.deleteSub')}</p>
      </div>
      <p className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
        {t('shape.shapes')} ({pathItems.length})
        <Tooltip text={t('shape.list.help')} label={t('shape.shapes')} />
      </p>
      <PathList items={pathItems} onHover={onHover} onDelete={onDelete} />
    </div>
  );
}
