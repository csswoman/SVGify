'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
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

const secondaryBtn =
  'focus-ring flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

const primaryBtn =
  'focus-ring flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60';

const COMPLEX_PATH_THRESHOLD = 80;

function MoreOptions({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="focus-ring flex min-h-9 w-full items-center justify-between gap-2 rounded py-1 text-left text-xs font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        aria-expanded={open}
      >
        {title}
        {open ? (
          <CaretUp size={14} className="shrink-0 text-gray-400" aria-hidden />
        ) : (
          <CaretDown size={14} className="shrink-0 text-gray-400" aria-hidden />
        )}
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
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
  const [morePalette, setMorePalette] = useState(false);
  const [moreCompression, setMoreCompression] = useState(false);
  const [confirmMaxOptimize, setConfirmMaxOptimize] = useState(false);

  const pathCount = countPaths(svgString);
  const byteSize = formatBytes(svgByteSize(svgString));
  const originalPalette = useMemo(() => extractPaletteFromSvgString(svgString), [svgString]);
  const showComplexWarn = pathCount >= COMPLEX_PATH_THRESHOLD;

  useEffect(() => {
    if (svgEl) extractColors();
  }, [svgEl, extractColors]);

  useEffect(() => {
    setConfirmMaxOptimize(false);
  }, [svgString]);

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
    setConfirmMaxOptimize(false);
  }, [svgString, onSvgString]);

  const handleCompactShapes = useCallback(() => {
    const compacted = compactSvgPaths(svgString, shapeTarget);
    // mergePaths:false — we already merged fragments; SVGO must not re-join
    // kept large shapes with compound groups or rewrite relative path joins.
    onSvgString(
      optimizeSvg(compacted, {
        dropDefaultOpacity: true,
        removeStroke: true,
        mergePaths: false,
      })
    );
  }, [svgString, shapeTarget, onSvgString]);

  const maxReduce = Math.max(2, Math.min(12, colors.length || 2));

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('tool.optimize')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('optimize.subtitle')}</p>
        {showComplexWarn && (
          <p className="text-xs text-amber-800 dark:text-amber-200">{t('vec.complexWarn')}</p>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('optimize.paletteSection')}
          </h3>
          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
            {colors.length} {t('vec.colors')}
          </span>
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('col.reduce')}: <span className="ml-1 font-mono">{targetCount}</span>
            <Tooltip text={t('col.reduce.help')} label={t('col.reduce')} />
          </label>
          <input
            type="range"
            min={2}
            max={maxReduce}
            value={Math.min(targetCount, maxReduce)}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label={`${t('col.reduce')}: ${targetCount}`}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            normalizePalette(targetCount);
            commitMountedSvg();
          }}
          className={primaryBtn}
          disabled={colors.length === 0}
        >
          {t('col.normalize')}
          <Tooltip nested text={t('col.normalize.help')} label={t('col.normalize')} />
        </button>

        <MoreOptions
          title={t('optimize.morePalette')}
          open={morePalette}
          onOpenChange={setMorePalette}
        >
          <div>
            <label className="mb-1 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
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
              aria-label={`${t('col.merge')}: ${mergeThreshold}`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              mergeSimilar(mergeThreshold);
              commitMountedSvg();
            }}
            className={secondaryBtn}
          >
            {t('col.mergeBtn')}
          </button>
          <button
            type="button"
            onClick={() => {
              snapDarksToBlack(72);
              commitMountedSvg();
            }}
            className={secondaryBtn}
          >
            {t('col.snapBlackBtn')}
            <Tooltip nested text={t('col.snapBlack.help')} label={t('col.snapBlack')} />
          </button>
        </MoreOptions>

        <ColorSwatches
          colors={colors}
          onColorClick={onSelectedColorChange}
          selectedColor={selectedColor}
          onColorDelete={handleDeleteColor}
          showTitle={false}
        />

        {originalPalette.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowOriginalPalette((v) => !v)}
              className="focus-ring flex min-h-9 w-full items-center justify-between gap-2 rounded py-1 text-xs font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-expanded={showOriginalPalette}
            >
              {t('col.originalColors')}
              {showOriginalPalette ? (
                <CaretUp size={14} className="text-gray-400" aria-hidden />
              ) : (
                <CaretDown size={14} className="text-gray-400" aria-hidden />
              )}
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
                      className="focus-ring h-8 w-8 rounded border border-gray-200 transition hover:ring-2 hover:ring-blue-400 dark:border-gray-700"
                      style={{ backgroundColor: hex }}
                      aria-label={`${t('col.originalColors')}: ${hex}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('optimize.optimizeSection')}
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {pathCount} {t('workspace.paths')} · {byteSize}
          </span>
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
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
            aria-label={`${t('shape.compactTarget')}: ${shapeTarget}`}
          />
        </div>

        <button
          type="button"
          onClick={handleCompactShapes}
          className={primaryBtn}
          disabled={pathCount === 0}
        >
          {t('shape.compact')}
        </button>

        <MoreOptions
          title={t('optimize.moreCompression')}
          open={moreCompression}
          onOpenChange={(open) => {
            setMoreCompression(open);
            if (!open) setConfirmMaxOptimize(false);
          }}
        >
          <button type="button" onClick={handleCleanFragments} className={secondaryBtn}>
            {t('vec.cleanFragments')}
            <Tooltip nested text={t('vec.cleanFragments.help')} label={t('vec.cleanFragments')} />
          </button>

          {confirmMaxOptimize ? (
            <div
              role="group"
              aria-label={t('vec.maxOptimize')}
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <p className="text-xs text-amber-950 dark:text-amber-100">{t('vec.maxOptimize.confirm')}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleMaxOptimize} className={`${secondaryBtn} sm:flex-1`}>
                  {t('vec.maxOptimize.confirmAction')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMaxOptimize(false)}
                  className="focus-ring min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-900/40 sm:flex-1"
                >
                  {t('vec.maxOptimize.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmMaxOptimize(true)}
              className={secondaryBtn}
              disabled={pathCount === 0}
            >
              {t('vec.maxOptimize')}
              <Tooltip nested text={t('vec.maxOptimize.help')} label={t('vec.maxOptimize')} />
            </button>
          )}
        </MoreOptions>
      </section>
    </div>
  );
}
