'use client';

import { useState } from 'react';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import {
  inspectorHint,
  inspectorLabelStrong,
  inspectorRange,
  inspectorStack,
} from '@/components/workspace/inspectorChrome';

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
    <div className={inspectorStack}>
      <InspectorHeader
        title={t('tool.nodes')}
        subtitle={hasSelectedPath ? t('shape.nodesActive') : undefined}
      />
      {!hasSelectedPath ? (
        <div className="space-y-1.5">
          <p className="text-sm text-ink dark:text-dark-ink">{t('shape.nodesHint')}</p>
          <p className={inspectorHint}>{t('shape.nodesSub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={inspectorHint}>
            {nodeCount} {t('shape.nodesCount')}
          </p>
          <div>
            <label className={inspectorLabelStrong}>
              {t('shape.simplifyStrength')}:{' '}
              <span className="ml-1 font-mono">{simplifyStrength.toFixed(2)}</span>
              <Tooltip text={t('shape.simplifyStrength.help')} label={t('shape.simplifyStrength')} />
            </label>
            <input
              type="range"
              min={0.2}
              max={1.6}
              step={0.05}
              value={simplifyStrength}
              onChange={(e) => setSimplifyStrength(Number(e.target.value))}
              className={inspectorRange}
              aria-label={`${t('shape.simplifyStrength')}: ${simplifyStrength.toFixed(2)}`}
            />
          </div>
          <button
            type="button"
            onClick={() => onSimplifySelected(simplifyStrength)}
            className="btn-secondary w-full"
          >
            {t('shape.simplifySelected')}
          </button>
          <button type="button" onClick={onDeselect} className="btn-tertiary w-full">
            {t('shape.deselect')}
          </button>
        </div>
      )}
    </div>
  );
}
