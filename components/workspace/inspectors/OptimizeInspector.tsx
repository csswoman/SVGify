'use client';

import { useCallback } from 'react';
import { svgByteSize, formatBytes, optimizeSvg } from '@/lib/optimizeSvg';
import { simplifySvgPaths, countPaths } from '@/lib/simplifyPath';
import {
  removeSmallNearWhiteSvgPaths,
  removeSmallSvgPathsByBounds,
} from '@/lib/iconVectorization';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface OptimizeInspectorProps {
  svgString: string;
  pathOmit: number;
  onSvgString: (svg: string) => void;
}

export function OptimizeInspector({ svgString, pathOmit, onSvgString }: OptimizeInspectorProps) {
  const { t } = useI18n();
  const pathCount = countPaths(svgString);
  const byteSize = formatBytes(svgByteSize(svgString));

  const handleCleanFragments = useCallback(() => {
    const minArea = Math.max(24, Math.round(pathOmit * 0.75));
    let cleaned = removeSmallNearWhiteSvgPaths(svgString, minArea);
    cleaned = removeSmallSvgPathsByBounds(cleaned, minArea);
    onSvgString(
      optimizeSvg(cleaned, { dropDefaultOpacity: true, removeStroke: true, sealSeams: 0.35 })
    );
  }, [svgString, pathOmit, onSvgString]);

  const handleMaxOptimize = useCallback(() => {
    onSvgString(
      optimizeSvg(simplifySvgPaths(svgString, 1.2, 0), { compressPaths: true, sealSeams: 1 })
    );
  }, [svgString, onSvgString]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.optimize')}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {pathCount} {t('workspace.paths')} · {byteSize}
      </p>
      <button
        type="button"
        onClick={handleCleanFragments}
        className="flex w-full items-center justify-center gap-1 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        {t('vec.cleanFragments')}
        <Tooltip text={t('vec.cleanFragments.help')} label={t('vec.cleanFragments')} />
      </button>
      <button
        type="button"
        onClick={handleMaxOptimize}
        className="flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        {t('vec.maxOptimize')}
        <Tooltip text={t('vec.maxOptimize.help')} label={t('vec.maxOptimize')} />
      </button>
    </div>
  );
}
