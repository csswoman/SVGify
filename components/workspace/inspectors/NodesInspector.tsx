'use client';

import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface NodesInspectorProps {
  hasSelectedPath: boolean;
  onDeselect: () => void;
}

export function NodesInspector({ hasSelectedPath, onDeselect }: NodesInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.nodes')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {hasSelectedPath ? t('shape.nodesActive') : t('shape.nodesHint')}
        </p>
      </div>
      <p className="flex items-center text-xs text-gray-500 dark:text-gray-400">
        <Tooltip text={t('shape.nodes.help')} label={t('shape.modeNodes')} />
      </p>
      {hasSelectedPath && (
        <button
          type="button"
          onClick={onDeselect}
          className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium transition hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          {t('shape.deselect')}
        </button>
      )}
    </div>
  );
}
