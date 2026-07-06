'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { svgByteSize, formatBytes, optimizeSvg } from '@/lib/optimizeSvg';
import { simplifySvgPaths, countPaths } from '@/lib/simplifyPath';
import { compactSvgPaths } from '@/lib/svgPathCompaction';
import {
  removeSmallNearWhiteSvgPaths,
  removeSmallSvgPathsByBounds,
} from '@/lib/iconVectorization';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface OptimizeInspectorProps {
  svgEl: SVGElement | null;
  svgString: string;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  serializeMountedSvg: () => string | null;
  pathOmit: number;
  onSvgString: (svg: string) => void;
}

export function OptimizeInspector({
  svgEl,
  svgString,
  selectedColor,
  onSelectedColorChange,
  serializeMountedSvg,
  pathOmit,
  onSvgString,
}: OptimizeInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors, replaceColor, deleteColor, mergeSimilar, snapDarksToBlack, normalizePalette } =
    useSvgColors(svgEl);
  const [targetCount, setTargetCount] = useState(6);
  const [mergeThreshold, setMergeThreshold] = useState(56);
  const [shapeTarget, setShapeTarget] = useState(50);
  const [showOriginalPalette, setShowOriginalPalette] = useState(false);

  const pathCount = countPaths(svgString);
  const byteSize = formatBytes(svgByteSize(svgString));
  const originalPalette = useMemo(() => extractPaletteFromSvgString(svgString), [svgString]);

  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  const commitMountedSvg = useCallback(() => {
    const nextSvg = serializeMountedSvg();
    if (nextSvg) onSvgString(nextSvg);
  }, [serializeMountedSvg, onSvgString]);

  const handleReapplyOriginal = useCallback(
    (color: RGBColor) => {
      if (selectedColor && rgbToHex(selectedColor) !== rgbToHex(color)) {
        replaceColor(selectedColor, color);
        onSelectedColorChange(color);
        commitMountedSvg();
      } else {
        onSelectedColorChange(color);
      }
    },
    [selectedColor, replaceColor, onSelectedColorChange, commitMountedSvg]
  );

  const handleDeleteColor = useCallback(
    (color: RGBColor) => {
      deleteColor(color);
      if (selectedColor && rgbToHex(selectedColor) === rgbToHex(color)) {
        onSelectedColorChange(null);
      }
      commitMountedSvg();
    },
    [deleteColor, selectedColor, onSelectedColorChange, commitMountedSvg]
  );

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

  const handleCompactShapes = useCallback(() => {
    const compacted = compactSvgPaths(svgString, shapeTarget);
    onSvgString(optimizeSvg(compacted, { dropDefaultOpacity: true, removeStroke: true }));
  }, [svgString, shapeTarget, onSvgString]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('tool.optimize')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('vec.complexWarn')}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('optimize.paletteSection')}
        </h2>

        <div className="space-y-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('col.reduce')}: <span className="ml-1 font-mono">{targetCount}</span>
            <Tooltip text={t('col.reduce.help')} label={t('col.reduce')} />
          </label>
          <input
            type="range"
            min={2}
            max={Math.max(2, Math.min(12, colors.length))}
            value={Math.min(targetCount, Math.max(2, Math.min(12, colors.length)))}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('col.merge')}: <span className="ml-1 font-mono">{mergeThreshold}</span>
            <Tooltip text={t('col.merge.help')} label={t('col.merge')} />
          </label>
          <input
            type="range"
            min={16}
            max={96}
            step={4}
            value={mergeThreshold}
            onChange={(e) => setMergeThreshold(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <button
            type="button"
            onClick={() => {
              mergeSimilar(mergeThreshold);
              commitMountedSvg();
            }}
            className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
          >
            {t('col.mergeBtn')}
          </button>
          <button
            type="button"
            onClick={() => {
              normalizePalette(targetCount);
              commitMountedSvg();
            }}
            className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('col.normalize')}
            <Tooltip nested text={t('col.normalize.help')} label={t('col.normalize')} />
          </button>
          <button
            type="button"
            onClick={() => {
              snapDarksToBlack(72);
              commitMountedSvg();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            {t('col.snapBlackBtn')}
            <Tooltip nested text={t('col.snapBlack.help')} label={t('col.snapBlack')} />
          </button>
        </div>

        <ColorSwatches
          colors={colors}
          onColorClick={onSelectedColorChange}
          selectedColor={selectedColor}
          onColorDelete={handleDeleteColor}
        />

        {originalPalette.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowOriginalPalette((v) => !v)}
              className="focus-ring flex w-full items-center text-xs font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="mr-1">{showOriginalPalette ? '▾' : '▸'}</span>
              {t('col.originalColors')}
            </button>
            {showOriginalPalette && (
              <div className="flex flex-wrap gap-1.5">
                {originalPalette.map((c) => {
                  const hex = rgbToHex(c);
                  return (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => handleReapplyOriginal(c)}
                      className="h-7 w-7 rounded border border-gray-200 shadow-sm transition hover:ring-2 hover:ring-blue-400 dark:border-gray-700"
                      style={{ backgroundColor: hex }}
                      aria-label={`Reapply original color ${hex}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('optimize.optimizeSection')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {pathCount} {t('workspace.paths')} · {byteSize}
        </p>
        <div className="space-y-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('shape.compactTarget')}: <span className="ml-1 font-mono">{shapeTarget}</span>
            <Tooltip text={t('shape.compact.help')} label={t('shape.compactTarget')} />
          </label>
          <input
            type="range"
            min={20}
            max={120}
            step={5}
            value={shapeTarget}
            onChange={(e) => setShapeTarget(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <button
            type="button"
            onClick={handleCompactShapes}
            className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('shape.compact')}
          </button>
        </div>
        <button
          type="button"
          onClick={handleCleanFragments}
          className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg border border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          {t('vec.cleanFragments')}
          <Tooltip nested text={t('vec.cleanFragments.help')} label={t('vec.cleanFragments')} />
        </button>
        <button
          type="button"
          onClick={handleMaxOptimize}
          className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          {t('vec.maxOptimize')}
          <Tooltip nested text={t('vec.maxOptimize.help')} label={t('vec.maxOptimize')} />
        </button>
      </section>
    </div>
  );
}
