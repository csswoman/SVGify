'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { extractPaletteFromSvgString, rgbToHex } from '@/lib/colorUtils';
import { ColorSwatches } from '@/components/colors/ColorSwatches';
import { svgByteSize, formatBytes, optimizeSvg } from '@/lib/optimizeSvg';
import { simplifySvgPaths, countPaths } from '@/lib/simplifyPath';
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
  onPushSnapshot: () => void;
  pathOmit: number;
  onSvgString: (svg: string) => void;
}

export function OptimizeInspector({
  svgEl,
  svgString,
  selectedColor,
  onSelectedColorChange,
  onPushSnapshot,
  pathOmit,
  onSvgString,
}: OptimizeInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors, replaceColor, deleteColor, snapDarksToBlack, normalizePalette } =
    useSvgColors(svgEl);
  const [targetCount, setTargetCount] = useState(6);
  const [originalPalette, setOriginalPalette] = useState<RGBColor[]>([]);
  const [showOriginalPalette, setShowOriginalPalette] = useState(false);

  const pathCount = countPaths(svgString);
  const byteSize = formatBytes(svgByteSize(svgString));

  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  useEffect(() => {
    setOriginalPalette(extractPaletteFromSvgString(svgString));
  }, [svgString]);

  const handleReapplyOriginal = useCallback(
    (color: RGBColor) => {
      if (selectedColor && rgbToHex(selectedColor) !== rgbToHex(color)) {
        replaceColor(selectedColor, color);
        onSelectedColorChange(color);
        onPushSnapshot();
      } else {
        onSelectedColorChange(color);
      }
    },
    [selectedColor, replaceColor, onSelectedColorChange, onPushSnapshot]
  );

  const handleDeleteColor = useCallback(
    (color: RGBColor) => {
      deleteColor(color);
      if (selectedColor && rgbToHex(selectedColor) === rgbToHex(color)) {
        onSelectedColorChange(null);
      }
      onPushSnapshot();
    },
    [deleteColor, selectedColor, onSelectedColorChange, onPushSnapshot]
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

  return (
    <div className="space-y-6">
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
          <button
            type="button"
            onClick={() => {
              normalizePalette(targetCount);
              onPushSnapshot();
            }}
            className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('col.normalize')}
            <Tooltip text={t('col.normalize.help')} label={t('col.normalize')} />
          </button>
          <button
            type="button"
            onClick={() => {
              snapDarksToBlack(72);
              onPushSnapshot();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            {t('col.snapBlackBtn')}
            <Tooltip text={t('col.snapBlack.help')} label={t('col.snapBlack')} />
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
        <button
          type="button"
          onClick={handleCleanFragments}
          className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg border border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          {t('vec.cleanFragments')}
          <Tooltip text={t('vec.cleanFragments.help')} label={t('vec.cleanFragments')} />
        </button>
        <button
          type="button"
          onClick={handleMaxOptimize}
          className="focus-ring flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          {t('vec.maxOptimize')}
          <Tooltip text={t('vec.maxOptimize.help')} label={t('vec.maxOptimize')} />
        </button>
      </section>
    </div>
  );
}
