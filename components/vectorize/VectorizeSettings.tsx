'use client';

import { useState } from 'react';
import { type VectorizeDetailLevel, VectorizeSettings } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
import { applyVectorizeProfile } from '@/lib/vectorizeProfiles';
import { resolvePaletteMergeCeiling } from '@/lib/iconModeSettings';
import { useI18n } from '@/lib/i18n';

/** Discrete color-count steps (2^precision). Slider uses precision 2–7. */
const COLOR_PRECISION_MIN = 2;
const COLOR_PRECISION_MAX = 7;
const COLOR_COUNT_TICKS = [4, 8, 16, 32, 64, 128] as const;

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeSettingsPanel({
  settings,
  onSettingsChange,
}: VectorizeSettingsProps) {
  const { t } = useI18n();
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
    onSettingsChange(applyVectorizeProfile(settings, { traceMode }));
  };

  const setDetailLevel = (detailLevel: VectorizeDetailLevel) => {
    if (detailLevel === settings.detailLevel) return;
    onSettingsChange(applyVectorizeProfile(settings, { detailLevel }));
  };

  const hasContextualRefinement = settings.traceMode === 'standard';

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

      <div>
        <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('set.detailLevel')}
          <Tooltip text={t('set.detailLevel.help')} label={t('set.detailLevel')} />
        </label>
        <div
          className="grid grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          role="group"
          aria-label={t('set.detailLevel')}
        >
          {(['clean', 'balanced', 'detailed'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDetailLevel(level)}
              className={`focus-ring min-h-11 rounded-md px-2 py-2 font-semibold transition ${
                settings.detailLevel === level
                  ? 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              aria-pressed={settings.detailLevel === level}
            >
              {t(`set.detailLevel.${level}`)}
            </button>
          ))}
        </div>
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

      {hasContextualRefinement && (
        <InspectorDisclosure
          title={t('set.advanced')}
          summary={t('set.refine.summary')}
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
        >
          {settings.traceMode === 'standard' && (
            <>
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
                  {t('set.cornerThreshold')}: <span className="ml-1 font-mono">{settings.cornerThreshold}</span>
                  <Tooltip text={t('set.cornerThreshold.help')} label={t('set.cornerThreshold')} />
                </label>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={settings.cornerThreshold}
                  onChange={(e) => onSettingsChange({ ...settings, cornerThreshold: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                  aria-label={`${t('set.cornerThreshold')}: ${settings.cornerThreshold}`}
                />
              </div>
            </>
          )}
        </InspectorDisclosure>
      )}
    </div>
  );
}
