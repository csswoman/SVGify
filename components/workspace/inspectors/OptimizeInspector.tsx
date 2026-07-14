'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DownloadButton } from '@/components/shared/DownloadButton';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
import { useI18n } from '@/lib/i18n';

interface OptimizeInspectorProps {
  svgEl: SVGElement | null;
  svgString: string;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  serializeMountedSvg: () => string | null;
  pathOmit: number;
  onSvgString: (svg: string) => void;
  onPrepared?: () => void;
  /** True after Prepare ran at least once for this document. */
  prepared?: boolean;
}

const secondaryBtn = 'btn-tertiary w-full';

const COMPLEX_PATH_THRESHOLD = 80;

export function OptimizeInspector({
  svgEl,
  svgString,
  selectedColor,
  onSelectedColorChange,
  serializeMountedSvg,
  pathOmit,
  onSvgString,
  onPrepared,
  prepared = false,
}: OptimizeInspectorProps) {
  const { t } = useI18n();
  const { colors, extractColors, replaceColor, deleteColor, mergeSimilar, snapDarksToBlack, normalizePalette } =
    useSvgColors(svgEl);
  const [targetCount, setTargetCount] = useState(6);
  const [mergeThreshold, setMergeThreshold] = useState(56);
  const [shapeTarget, setShapeTarget] = useState(50);
  const [preparePreset, setPreparePreset] = useState<'smaller' | 'balanced' | 'detail'>('balanced');
  const [showOriginalPalette, setShowOriginalPalette] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [confirmMaxOptimize, setConfirmMaxOptimize] = useState(false);
  const [confirmForSvg, setConfirmForSvg] = useState(svgString);
  const [byteDelta, setByteDelta] = useState<{ before: number; after: number } | null>(null);

  const pathCount = countPaths(svgString);
  const byteSize = svgByteSize(svgString);
  const byteSizeLabel = formatBytes(byteSize);
  const originalPalette = useMemo(() => extractPaletteFromSvgString(svgString), [svgString]);
  const showComplexWarn = pathCount >= COMPLEX_PATH_THRESHOLD;

  if (svgString !== confirmForSvg) {
    setConfirmForSvg(svgString);
    setConfirmMaxOptimize(false);
  }

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
    const before = svgByteSize(svgString);
    const minArea = Math.max(24, Math.round(pathOmit * 0.75));
    let cleaned = removeSmallNearWhiteSvgPaths(svgString, minArea);
    cleaned = removeSmallSvgPathsByBounds(cleaned, minArea);
    const next = optimizeSvg(cleaned, {
      dropDefaultOpacity: true,
      removeStroke: true,
      sealSeams: 0.35,
    });
    setByteDelta({ before, after: svgByteSize(next) });
    onSvgString(next);
  }, [svgString, pathOmit, onSvgString]);

  const handleMaxOptimize = useCallback(() => {
    const before = svgByteSize(svgString);
    const next = optimizeSvg(simplifySvgPaths(svgString, 1.2, 0), {
      compressPaths: true,
      sealSeams: 1,
    });
    setByteDelta({ before, after: svgByteSize(next) });
    onSvgString(next);
    setConfirmMaxOptimize(false);
  }, [svgString, onSvgString]);

  const handleCompactShapes = useCallback(() => {
    const before = svgByteSize(svgString);
    const compacted = compactSvgPaths(svgString, shapeTarget);
    const next = optimizeSvg(compacted, {
      dropDefaultOpacity: true,
      removeStroke: true,
      mergePaths: false,
    });
    setByteDelta({ before, after: svgByteSize(next) });
    onSvgString(next);
  }, [svgString, shapeTarget, onSvgString]);

  const handlePrepareDownload = useCallback(() => {
    const before = svgByteSize(svgString);
    if (colors.length > 0) {
      normalizePalette(Math.min(targetCount, Math.max(2, colors.length)));
    }
    const afterNorm = serializeMountedSvg() ?? svgString;
    const compacted = compactSvgPaths(afterNorm, shapeTarget);
    const next = optimizeSvg(compacted, {
      dropDefaultOpacity: true,
      removeStroke: true,
      mergePaths: false,
    });
    setByteDelta({ before, after: svgByteSize(next) });
    onSvgString(next);
    onPrepared?.();
  }, [
    svgString,
    colors.length,
    normalizePalette,
    targetCount,
    serializeMountedSvg,
    shapeTarget,
    onSvgString,
    onPrepared,
  ]);

  const maxReduce = Math.max(2, Math.min(12, colors.length || 2));
  const savedBytes =
    byteDelta && byteDelta.after < byteDelta.before
      ? byteDelta.before - byteDelta.after
      : null;

  const applyPreparePreset = useCallback(
    (preset: 'smaller' | 'balanced' | 'detail') => {
      setPreparePreset(preset);
      if (preset === 'smaller') {
        setTargetCount(Math.min(4, maxReduce));
        setShapeTarget(30);
        return;
      }
      if (preset === 'detail') {
        setTargetCount(Math.min(10, maxReduce));
        setShapeTarget(90);
        return;
      }
      setTargetCount(Math.min(6, maxReduce));
      setShapeTarget(50);
    },
    [maxReduce]
  );

  const advancedSummary = prepared
    ? `${colors.length} ${t('vec.colors')} · ${pathCount} ${t('workspace.paths')}`
    : t('optimize.advanced.summary');

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('tool.optimize')}
        </h2>
        <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">{t('optimize.subtitle')}</p>
        {showComplexWarn && (
          <p className="text-pretty text-xs text-amber-800 dark:text-amber-200">{t('vec.complexWarn')}</p>
        )}
      </div>

      {/* Hero: one primary action for production-ready export */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] tabular-nums text-gray-600 dark:text-gray-300">
          <span>
            {pathCount} {t('workspace.paths')} · {byteSizeLabel}
          </span>
          {savedBytes !== null ? (
            <span className="text-gray-700 dark:text-gray-200">−{formatBytes(savedBytes)}</span>
          ) : null}
        </div>
        <div
          className="flex gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-800"
          role="group"
          aria-label={t('optimize.prepare')}
        >
          {(
            [
              ['smaller', 'optimize.prepare.preset.smaller'],
              ['balanced', 'optimize.prepare.preset.balanced'],
              ['detail', 'optimize.prepare.preset.detail'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreparePreset(id)}
              aria-pressed={preparePreset === id}
              className={[
                'focus-ring flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition',
                preparePreset === id
                  ? 'bg-action-blue-surface text-action-blue dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
          {t('optimize.prepare.targets')
            .replace('{colors}', String(Math.min(targetCount, maxReduce)))
            .replace('{shapes}', String(shapeTarget))}
        </p>
        <button
          type="button"
          onClick={handlePrepareDownload}
          className="btn-tertiary w-full"
          disabled={pathCount === 0}
        >
          {t('optimize.prepare')}
        </button>
        <p className="text-pretty text-[11px] text-gray-500 dark:text-gray-400">
          {t('optimize.prepare.help')}
        </p>
        {!prepared ? (
          <DownloadButton
            svgString={svgString}
            prepared={false}
            gateUntilPrepared={false}
            className="w-full !min-h-10 text-xs"
          />
        ) : null}
      </div>

      <InspectorDisclosure
        title={t('optimize.advanced')}
        summary={advancedSummary}
        open={advancedOpen}
        onOpenChange={(open) => {
          setAdvancedOpen(open);
          if (!open) setConfirmMaxOptimize(false);
        }}
      >
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('optimize.paletteSection')}
            </h3>
            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
              {colors.length} {t('vec.colors')}
            </span>
          </div>

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
                className="focus-ring flex min-h-11 w-full items-center justify-between gap-2 rounded py-1 text-xs font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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

        <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('optimize.morePalette')}
          </p>
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
              onChange={(e) => {
                setTargetCount(Number(e.target.value));
                setPreparePreset('balanced');
              }}
              className="w-full accent-blue-600"
              aria-label={`${t('col.reduce')}: ${targetCount}`}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const before = svgByteSize(svgString);
              normalizePalette(targetCount);
              commitMountedSvg();
              const after = svgByteSize(serializeMountedSvg() ?? svgString);
              setByteDelta({ before, after });
            }}
            className={secondaryBtn}
            disabled={colors.length === 0}
          >
            {t('col.normalize')}
            <Tooltip nested text={t('col.normalize.help')} label={t('col.normalize')} />
          </button>

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
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('optimize.moreCompression')}
          </p>
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
              onChange={(e) => {
                setShapeTarget(Number(e.target.value));
                setPreparePreset('balanced');
              }}
              className="w-full accent-blue-600"
              aria-label={`${t('shape.compactTarget')}: ${shapeTarget}`}
            />
          </div>

          <button
            type="button"
            onClick={handleCompactShapes}
            className={secondaryBtn}
            disabled={pathCount === 0}
          >
            {t('shape.compact')}
          </button>
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
              <p className="text-pretty text-xs text-amber-950 dark:text-amber-100">
                {t('vec.maxOptimize.confirm')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleMaxOptimize} className={`${secondaryBtn} sm:flex-1`}>
                  {t('vec.maxOptimize.confirmAction')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMaxOptimize(false)}
                  className="btn-tertiary sm:flex-1"
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
        </div>
      </InspectorDisclosure>
    </div>
  );
}
