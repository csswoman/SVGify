'use client';

import { useI18n } from '@/lib/i18n';

export interface PathItem {
  el: SVGPathElement;
  id: number;
  fill: string;
  area: number;
  nodeCount: number;
}

interface PathListProps {
  items: PathItem[];
  onHover: (el: SVGPathElement | null) => void;
  onDelete: (item: PathItem) => void;
}

/**
 * Figma-style layer list: every path in the SVG, with its color. Hovering a row
 * highlights that path in the preview; the trash icon deletes it.
 */
export function PathList({ items, onHover, onDelete }: PathListProps) {
  const { t } = useI18n();

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">{t('shape.noShapes')}</p>;
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
      {items.map((item) => (
        <div
          key={item.id}
          onMouseEnter={() => onHover(item.el)}
          onMouseLeave={() => onHover(null)}
          className="group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 text-sm transition"
        >
          <span
            className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 shrink-0"
            style={{ backgroundColor: item.fill }}
          />
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
            {t('shape.shape')} {item.id + 1} · {item.nodeCount} {t('shape.nodesShort')} · {item.fill}
          </span>
          <button
            onClick={() => onDelete(item)}
            className="shrink-0 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            aria-label={`${t('shape.deleteShape')} ${item.id + 1}`}
            title={t('shape.deleteShape')}
          >
            🗑
          </button>
        </div>
      ))}
    </div>
  );
}
