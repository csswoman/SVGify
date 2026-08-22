'use client';

import { useState } from 'react';
import { type VectorizeDetailLevel, type VectorizeProductSettings } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
import {
  inspectorLabelStrong,
  inspectorRange,
} from '@/components/workspace/inspectorChrome';
import { applyVectorizeProductChoice } from '@/lib/vectorizeProfiles';
import { useI18n } from '@/lib/i18n';

/** Discrete color-count steps (2^precision). Slider uses precision 2–7. */
const COLOR_PRECISION_MIN = 2;
const COLOR_PRECISION_MAX = 7;
const COLOR_COUNT_TICKS = [4, 8, 16, 32, 64, 128] as const;

/** Thumb is 14px wide (see .themed-range); its center travels 7px … width−7px. */
const RANGE_THUMB_HALF_PX = 7;

const segmentGroup =
  'grid rounded-md border border-border bg-canvas-bg p-0.5 text-xs dark:border-dark-border dark:bg-dark-canvas-bg';

const segmentBtn = (active: boolean) =>
  [
    'focus-ring min-h-9 rounded px-2 py-1.5 font-semibold transition',
    active
      ? 'bg-surface text-ink dark:bg-dark-surface dark:text-dark-ink'
      : 'text-ink-muted hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink',
  ].join(' ');

interface VectorizeSettingsProps {
  settings: VectorizeProductSettings;
  onSettingsChange: (settings: VectorizeProductSettings) => void;
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
    onSettingsChange({
      ...settings,
      colorPrecision: clamped,
      numberofcolors: colorCount,
    });
  };

  const setTraceMode = (traceMode: VectorizeProductSettings['traceMode']) => {
    if (traceMode === settings.traceMode) return;
    onSettingsChange(applyVectorizeProductChoice(settings, { traceMode }));
  };

  const setDetailLevel = (detailLevel: VectorizeDetailLevel) => {
    if (detailLevel === settings.detailLevel) return;
    onSettingsChange(applyVectorizeProductChoice(settings, { detailLevel }));
  };

  const hasContextualRefinement = settings.traceMode === 'standard';

  return (
    <div className="space-y-3">
      <div>
        <label className={inspectorLabelStrong}>
          {t('set.traceMode')}
          <Tooltip text={t('set.traceMode.help')} label={t('set.traceMode')} />
        </label>
        <div
          className={`${segmentGroup} grid-cols-2`}
          role="group"
          aria-label={t('set.traceMode')}
        >
          <button
            type="button"
            onClick={() => setTraceMode('standard')}
            className={segmentBtn(settings.traceMode === 'standard')}
            aria-pressed={settings.traceMode === 'standard'}
          >
            {t('set.traceMode.standard')}
          </button>
          <button
            type="button"
            onClick={() => setTraceMode('icon')}
            className={segmentBtn(settings.traceMode === 'icon')}
            aria-pressed={settings.traceMode === 'icon'}
          >
            {t('set.traceMode.icon')}
          </button>
        </div>
        {settings.traceMode === 'icon' ? (
          <p className="mt-1.5 text-pretty text-xs text-ink-muted dark:text-dark-ink-muted">
            {t('set.traceMode.icon.help')}
          </p>
        ) : null}
      </div>

      <div>
        <label className={inspectorLabelStrong}>
          {t('set.detailLevel')}
          <Tooltip text={t('set.detailLevel.help')} label={t('set.detailLevel')} />
        </label>
        <div
          className={`${segmentGroup} grid-cols-3`}
          role="group"
          aria-label={t('set.detailLevel')}
        >
          {(['clean', 'balanced', 'detailed'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDetailLevel(level)}
              className={segmentBtn(settings.detailLevel === level)}
              aria-pressed={settings.detailLevel === level}
            >
              {t(`set.detailLevel.${level}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          id="vectorize-color-precision-label"
          htmlFor="vectorize-color-precision"
          className={inspectorLabelStrong}
        >
          {t('set.maxColors')}: <span className="ml-1 font-mono">{colorCount}</span>
          <Tooltip text={t('set.maxColors.help')} label={t('set.maxColors')} />
        </label>
        <input
          type="range"
          min={COLOR_PRECISION_MIN}
          max={COLOR_PRECISION_MAX}
          step={1}
          value={colorPrecision}
          onChange={(e) => setColorPrecision(Number(e.target.value))}
          id="vectorize-color-precision"
          className={inspectorRange}
          aria-labelledby="vectorize-color-precision-label"
          list="color-precision-ticks"
        />
        <datalist id="color-precision-ticks">
          {COLOR_COUNT_TICKS.map((_, i) => (
            <option key={COLOR_COUNT_TICKS[i]} value={COLOR_PRECISION_MIN + i} />
          ))}
        </datalist>
        {/*
          Tick centers must match discrete thumb stops: the thumb center
          travels from 7px to (width − 7px), not edge to edge.
        */}
        <div className="relative mt-0.5 h-4" aria-hidden>
          {COLOR_COUNT_TICKS.map((count, i) => {
            const progress = i / (COLOR_COUNT_TICKS.length - 1);
            return (
              <span
                key={count}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{
                  left: `calc(${RANGE_THUMB_HALF_PX}px + ${progress} * (100% - ${RANGE_THUMB_HALF_PX * 2}px))`,
                }}
              >
                <span className="h-1 w-px bg-ink-subtle dark:bg-dark-ink-muted" />
                <span className="mt-0.5 font-mono text-[10px] leading-none text-ink-muted dark:text-dark-ink-muted">
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {hasContextualRefinement ? (
        <InspectorDisclosure
          title={t('set.advanced')}
          summary={t('set.refine.summary')}
          open={showAdvanced}
          onOpenChange={setShowAdvanced}
        >
          {settings.traceMode === 'standard' ? (
            <div className="space-y-3">
              <div>
                <label
                  id="vectorize-bilateral-radius-label"
                  htmlFor="vectorize-bilateral-radius"
                  className={inspectorLabelStrong}
                >
                  {t('set.blur')}: <span className="ml-1 font-mono">{settings.bilateralRadius}</span>
                  <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
                </label>
                <input
                  id="vectorize-bilateral-radius"
                  type="range"
                  min={0}
                  max={3}
                  step={1}
                  value={settings.bilateralRadius}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      bilateralRadius: Number(e.target.value),
                    })
                  }
                  className={inspectorRange}
                  aria-labelledby="vectorize-bilateral-radius-label"
                />
              </div>

              <div>
                <label
                  id="vectorize-corner-threshold-label"
                  htmlFor="vectorize-corner-threshold"
                  className={inspectorLabelStrong}
                >
                  {t('set.cornerThreshold')}:{' '}
                  <span className="ml-1 font-mono">{settings.cornerThreshold}</span>
                  <Tooltip text={t('set.cornerThreshold.help')} label={t('set.cornerThreshold')} />
                </label>
                <input
                  id="vectorize-corner-threshold"
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={settings.cornerThreshold}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, cornerThreshold: Number(e.target.value) })
                  }
                  className={inspectorRange}
                  aria-labelledby="vectorize-corner-threshold-label"
                />
              </div>
            </div>
          ) : null}
        </InspectorDisclosure>
      ) : null}
    </div>
  );
}
