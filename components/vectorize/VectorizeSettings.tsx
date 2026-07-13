'use client';

import { useState } from 'react';
import { VECTORIZE_DEFAULTS, VectorizeSettings } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
import { ICON_MODE_SETTINGS, resolvePaletteMergeCeiling } from '@/lib/iconModeSettings';
import { useI18n } from '@/lib/i18n';

/** Discrete color-count steps (2^precision). Slider uses precision 2–7. */
const COLOR_PRECISION_MIN = 2;
const COLOR_PRECISION_MAX = 7;
const COLOR_COUNT_TICKS = [4, 8, 16, 32, 64, 128] as const;

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeSettingsPanel({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const { t } = useI18n();
  const [showQuality, setShowQuality] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const colorPrecision = Math.max(
    COLOR_PRECISION_MIN,
    Math.min(COLOR_PRECISION_MAX, settings.colorPrecision)
  );
  const colorCount = 2 ** colorPrecision;

  const setColorPrecision = (next: number) => {
    const clamped = Math.max(COLOR_PRECISION_MIN, Math.min(COLOR_PRECISION_MAX, Math.round(next)));
    if (clamped === settings.colorPrecision) return;
    const colorCount = 2 ** clamped;
    const mergeCeiling = resolvePaletteMergeCeiling(colorCount);
    onSettingsChange({
      ...settings,
      colorPrecision: clamped,
      numberofcolors: colorCount,
      // More requested colors need a finer palette. Never raise a merge value
      // the user has already tuned down manually.
      paletteMergeThreshold: settings.traceMode === 'standard'
        ? Math.min(settings.paletteMergeThreshold, mergeCeiling)
        : settings.paletteMergeThreshold,
    });
  };

  const setTraceMode = (traceMode: VectorizeSettings['traceMode']) => {
    if (traceMode === settings.traceMode) return;
    if (traceMode === 'icon') {
      onSettingsChange({
        ...settings,
        traceMode,
        ...ICON_MODE_SETTINGS,
      });
      return;
    }

    onSettingsChange({
      ...settings,
      traceMode,
      colorPrecision: VECTORIZE_DEFAULTS.colorPrecision,
      numberofcolors: VECTORIZE_DEFAULTS.numberofcolors,
      filterSpeckle: VECTORIZE_DEFAULTS.filterSpeckle,
      pathomit: VECTORIZE_DEFAULTS.pathomit,
      cornerThreshold: VECTORIZE_DEFAULTS.cornerThreshold,
      pathPrecision: VECTORIZE_DEFAULTS.pathPrecision,
      roundcoords: VECTORIZE_DEFAULTS.roundcoords,
      paletteMergeThreshold: VECTORIZE_DEFAULTS.paletteMergeThreshold,
      bilateralRadius: VECTORIZE_DEFAULTS.bilateralRadius,
      blurRadius: VECTORIZE_DEFAULTS.blurRadius,
      layerDifference: VECTORIZE_DEFAULTS.layerDifference,
      lengthThreshold: VECTORIZE_DEFAULTS.lengthThreshold,
      maxIterations: VECTORIZE_DEFAULTS.maxIterations,
      spliceThreshold: VECTORIZE_DEFAULTS.spliceThreshold,
      fillOverlap: VECTORIZE_DEFAULTS.fillOverlap,
      lineSmoothing: VECTORIZE_DEFAULTS.lineSmoothing,
      curveSmoothing: VECTORIZE_DEFAULTS.curveSmoothing,
    });
  };

  const qualitySummary = t('set.adjustQuality.summary')
    .replace('{colors}', String(colorCount))
    .replace('{blur}', String(settings.bilateralRadius));

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('set.traceMode')}
          <Tooltip text={t('set.traceMode.help')} label={t('set.traceMode')} />
        </label>
        <div
          className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          role="group"
          aria-label={t('set.traceMode')}
        >
          <button
            type="button"
            onClick={() => setTraceMode('standard')}
            className={`focus-ring min-h-11 rounded-md px-3 py-2 font-semibold transition ${
                settings.traceMode === 'standard'
                  ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            aria-pressed={settings.traceMode === 'standard'}
          >
            {t('set.traceMode.standard')}
          </button>
          <button
            type="button"
            onClick={() => setTraceMode('icon')}
            className={`focus-ring min-h-11 rounded-md px-3 py-2 font-semibold transition ${
                settings.traceMode === 'icon'
                  ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            aria-pressed={settings.traceMode === 'icon'}
          >
            {t('set.traceMode.icon')}
          </button>
        </div>
        {settings.traceMode === 'icon' && (
          <p className="mt-2 text-pretty text-xs text-gray-500 dark:text-gray-400">
            {t('set.traceMode.icon.help')}
          </p>
        )}
      </div>

      <InspectorDisclosure
        title={t('set.adjustQuality')}
        summary={qualitySummary}
        open={showQuality}
        onOpenChange={setShowQuality}
      >
        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.blur')}: <span className="ml-1 font-mono">{settings.bilateralRadius}</span>
            <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={settings.bilateralRadius}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                bilateralRadius: Number(e.target.value),
                blurRadius: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.blur')}: ${settings.bilateralRadius}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.colors')}: <span className="ml-1 font-mono">{colorCount}</span>
            <Tooltip text={t('set.colors.help')} label={t('set.colors')} />
          </label>
          <input
            type="range"
            min={COLOR_PRECISION_MIN}
            max={COLOR_PRECISION_MAX}
            step={1}
            value={colorPrecision}
            onChange={(e) => setColorPrecision(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-label={`${t('set.colors')}: ${colorCount}`}
            list="color-precision-ticks"
          />
          <datalist id="color-precision-ticks">
            {COLOR_COUNT_TICKS.map((_, i) => (
              <option key={COLOR_COUNT_TICKS[i]} value={COLOR_PRECISION_MIN + i} />
            ))}
          </datalist>
          <div className="relative mt-1 h-4" aria-hidden>
            {COLOR_COUNT_TICKS.map((count, i) => {
              const pct = (i / (COLOR_COUNT_TICKS.length - 1)) * 100;
              return (
                <span
                  key={count}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${pct}%` }}
                >
                  <span className="h-1.5 w-px bg-gray-300 dark:bg-gray-600" />
                  <span className="mt-0.5 font-mono text-[10px] leading-none text-gray-400 dark:text-gray-500">
                    {count}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.paletteMerge')}:{' '}
            <span className="ml-1 font-mono">{settings.paletteMergeThreshold}</span>
            <Tooltip text={t('set.paletteMerge.help')} label={t('set.paletteMerge')} />
          </label>
          <input
            type="range"
            min={0}
            max={128}
            value={settings.paletteMergeThreshold}
            onChange={(e) => {
              const paletteMergeThreshold = Number(e.target.value);
              if (paletteMergeThreshold === settings.paletteMergeThreshold) return;
              onSettingsChange({ ...settings, paletteMergeThreshold });
            }}
            className="w-full accent-blue-600"
            aria-label={`${t('set.paletteMerge')}: ${settings.paletteMergeThreshold}`}
          />
        </div>
      </InspectorDisclosure>

      <InspectorDisclosure
        title={t('set.advanced')}
        open={showAdvanced}
        onOpenChange={setShowAdvanced}
      >
        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.noise')}: <span className="ml-1 font-mono">{settings.filterSpeckle}</span>
            <Tooltip text={t('set.noise.help')} label={t('set.noise')} />
          </label>
          <input
            type="range"
            min={0}
            max={40}
            value={settings.filterSpeckle}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                filterSpeckle: Number(e.target.value),
                pathomit: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.noise')}: ${settings.filterSpeckle}`}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('set.noise.hint')}</p>
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.cornerThreshold')}:{' '}
            <span className="ml-1 font-mono">{settings.cornerThreshold}</span>
            <Tooltip text={t('set.cornerThreshold.help')} label={t('set.cornerThreshold')} />
          </label>
          <input
            type="range"
            min={0}
            max={180}
            step={5}
            value={settings.cornerThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, cornerThreshold: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.cornerThreshold')}: ${settings.cornerThreshold}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.precision')}: <span className="ml-1 font-mono">{settings.pathPrecision}</span>
            <Tooltip text={t('set.precision.help')} label={t('set.precision')} />
          </label>
          <input
            type="range"
            min={0}
            max={8}
            value={settings.pathPrecision}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                pathPrecision: Number(e.target.value),
                roundcoords: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.precision')}: ${settings.pathPrecision}`}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('set.precision.hint')}</p>
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.traceScale')}:{' '}
            <span className="ml-1 font-mono">{settings.preprocessingScale}x</span>
            <Tooltip text={t('set.traceScale.help')} label={t('set.traceScale')} />
          </label>
          <input
            type="range"
            min={1}
            max={2}
            step={1}
            value={settings.preprocessingScale}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                preprocessingScale: Number(e.target.value),
                traceScale: Number(e.target.value),
              })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.traceScale')}: ${settings.preprocessingScale}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.bilateralSigma')}:{' '}
            <span className="ml-1 font-mono">{settings.bilateralColorSigma}</span>
            <Tooltip text={t('set.bilateralSigma.help')} label={t('set.bilateralSigma')} />
          </label>
          <input
            type="range"
            min={1}
            max={96}
            value={settings.bilateralColorSigma}
            onChange={(e) =>
              onSettingsChange({ ...settings, bilateralColorSigma: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.bilateralSigma')}: ${settings.bilateralColorSigma}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.alphaThreshold')}: <span className="ml-1 font-mono">{settings.alphaThreshold}</span>
            <Tooltip text={t('set.alphaThreshold.help')} label={t('set.alphaThreshold')} />
          </label>
          <input
            type="range"
            min={0}
            max={255}
            value={settings.alphaThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, alphaThreshold: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.alphaThreshold')}: ${settings.alphaThreshold}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.layerDifference')}:{' '}
            <span className="ml-1 font-mono">{settings.layerDifference}</span>
            <Tooltip text={t('set.layerDifference.help')} label={t('set.layerDifference')} />
          </label>
          <input
            type="range"
            min={0}
            max={64}
            value={settings.layerDifference}
            onChange={(e) =>
              onSettingsChange({ ...settings, layerDifference: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.layerDifference')}: ${settings.layerDifference}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.lengthThreshold')}:{' '}
            <span className="ml-1 font-mono">{settings.lengthThreshold}</span>
            <Tooltip text={t('set.lengthThreshold.help')} label={t('set.lengthThreshold')} />
          </label>
          <input
            type="range"
            min={1}
            max={32}
            step={1}
            value={settings.lengthThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, lengthThreshold: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.lengthThreshold')}: ${settings.lengthThreshold}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.maxIterations')}: <span className="ml-1 font-mono">{settings.maxIterations}</span>
            <Tooltip text={t('set.maxIterations.help')} label={t('set.maxIterations')} />
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={settings.maxIterations}
            onChange={(e) =>
              onSettingsChange({ ...settings, maxIterations: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.maxIterations')}: ${settings.maxIterations}`}
          />
        </div>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.spliceThreshold')}:{' '}
            <span className="ml-1 font-mono">{settings.spliceThreshold}</span>
            <Tooltip text={t('set.spliceThreshold.help')} label={t('set.spliceThreshold')} />
          </label>
          <input
            type="range"
            min={0}
            max={180}
            step={5}
            value={settings.spliceThreshold}
            onChange={(e) =>
              onSettingsChange({ ...settings, spliceThreshold: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.spliceThreshold')}: ${settings.spliceThreshold}`}
          />
        </div>
      </InspectorDisclosure>
    </div>
  );
}
