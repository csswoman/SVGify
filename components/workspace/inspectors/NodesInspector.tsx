'use client';

import { useState } from 'react';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface NodesInspectorProps {
  hasSelectedPath: boolean;
  nodeCount: number;
  onSimplifySelected: (epsilon?: number) => void;
  onDeselect: () => void;
}

export function NodesInspector({
  hasSelectedPath,
  nodeCount,
  onSimplifySelected,
  onDeselect,
}: NodesInspectorProps) {
  const { t } = useI18n();
  const [simplifyStrength, setSimplifyStrength] = useState(0.55);

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
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {nodeCount} {t('shape.nodesCount')}
          </p>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('shape.simplifyStrength')}: <span className="ml-1 font-mono">{simplifyStrength.toFixed(2)}</span>
            <Tooltip text={t('shape.simplifyStrength.help')} label={t('shape.simplifyStrength')} />
          </label>
          <input
            type="range"
            min={0.2}
            max={1.6}
            step={0.05}
            value={simplifyStrength}
            onChange={(e) => setSimplifyStrength(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <button
            type="button"
            onClick={() => onSimplifySelected(simplifyStrength)}
            className="focus-ring w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('shape.simplifySelected')}
          </button>
          <button
            type="button"
            onClick={onDeselect}
            className="focus-ring w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium transition hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            {t('shape.deselect')}
          </button>
        </div>
      )}
    </div>
  );
}
