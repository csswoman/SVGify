'use client';

import { useState } from 'react';
import { Trash } from '@phosphor-icons/react';
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
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('shape.noShapes')}</p>;
  }

  return (
    <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
      {items.map((item) => {
        const confirming = pendingDeleteId === item.id;

        return (
          <div
            key={item.id}
            onMouseEnter={() => onHover(item.el)}
            onMouseLeave={() => onHover(null)}
            className="group flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm transition hover:bg-blue-50 dark:bg-gray-700/50 dark:hover:bg-gray-700"
          >
            <span
              className="h-5 w-5 shrink-0 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600 dark:text-gray-300">
              {t('shape.shape')} {item.id + 1} · {item.nodeCount} {t('shape.nodesShort')} · {item.fill}
            </span>
            {confirming ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(item);
                    setPendingDeleteId(null);
                  }}
                  className="focus-ring rounded px-2 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  {t('shape.deleteShape.confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(null)}
                  className="focus-ring rounded px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600"
                >
                  {t('shape.deleteShape.cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPendingDeleteId(item.id)}
                className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-500 transition hover:bg-gray-200 hover:text-red-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-red-300"
                aria-label={`${t('shape.deleteShape')} ${item.id + 1}`}
                title={t('shape.deleteShape')}
              >
                <Trash size={16} aria-hidden />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
