'use client';

import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { VectorizeSettingsPanel } from '@/components/vectorize/VectorizeSettings';
import { EditablePalette } from '@/components/vectorize/EditablePalette';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
import { InspectorHeader } from '@/components/workspace/InspectorHeader';
import {
  inspectorCheckbox,
  inspectorHint,
  inspectorLabel,
  inspectorRange,
} from '@/components/workspace/inspectorChrome';
import { Tooltip } from '@/components/shared/Tooltip';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useI18n } from '@/lib/i18n';

interface VectorizeInspectorProps {
  session: ReturnType<typeof useVectorizeSession>;
}

export function VectorizeInspector({ session }: VectorizeInspectorProps) {
  const { t } = useI18n();
  const {
    settings,
    updateSettings,
    removeBg,
    setRemoveBg,
    bgTolerance,
    setBgTolerance,
    seeds,
    setSeeds,
    paletteColors,
    selectedPaletteColor,
    selectPaletteColor,
    addPaletteColor,
    updateSelectedPaletteColor,
    deletePaletteColor,
    mergeSimilarPaletteColors,
    resetPalette,
    error,
    isLoading,
    svg,
    hasTranslucentEdges,
  } = session;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const hasSvg = svg !== null;

  const paletteCountSummary =
    paletteColors.length === 1
      ? `1 ${t('vec.color')}`
      : `${paletteColors.length} ${t('vec.colors')}`;
  const paletteSummary = `${paletteCountSummary} · ${t(`set.detailLevel.${settings.detailLevel}`)}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <InspectorHeader title={t('vec.title')} subtitle={t('vec.subtitle')} />
        {!hasSvg ? (
          <p className={inspectorHint} aria-live="polite">
            {isLoading ? t('onboard.traceAction') : t('onboard.vectorizeCue')}
          </p>
        ) : null}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-surface p-3 text-xs text-danger-ink dark:border-dark-danger-border dark:bg-dark-danger-surface dark:text-dark-danger-ink"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        <VectorizeSettingsPanel
          settings={settings}
          onSettingsChange={updateSettings}
        />

        <div className="space-y-2.5 border-t border-border pt-3 dark:border-dark-border">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium text-ink dark:text-dark-ink">
            <input
              type="checkbox"
              checked={removeBg}
              onChange={(e) => setRemoveBg(e.target.checked)}
              className={inspectorCheckbox}
            />
            {t('bg.remove')}
            <Tooltip text={t('bg.auto.help')} label={t('bg.remove')} />
          </label>

          {removeBg && (
            <div className="space-y-2">
              {seeds.length > 0 ? (
                <p className={inspectorHint}>{t('bg.picking')}</p>
              ) : null}
              <div>
                <label id="vectorize-bg-tolerance-label" htmlFor="vectorize-bg-tolerance" className={inspectorLabel}>
                  {t('bg.tolerance')}: <span className="ml-1 font-mono">{bgTolerance}</span>
                  <Tooltip text={t('bg.tolerance.help')} label={t('bg.tolerance')} />
                </label>
                <input
                  type="range"
                  min={0}
                  max={128}
                  value={bgTolerance}
                  onChange={(e) => setBgTolerance(Number(e.target.value))}
                  id="vectorize-bg-tolerance"
                  className={inspectorRange}
                  aria-labelledby="vectorize-bg-tolerance-label"
                />
              </div>
              {seeds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSeeds([])}
                  className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-action-blue transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X size={14} weight="bold" aria-hidden />
                  {t('bg.clear')} ({seeds.length})
                </button>
              )}
            </div>
          )}

          {hasTranslucentEdges && (
            <div>
              <label id="vectorize-alpha-threshold-label" htmlFor="vectorize-alpha-threshold" className={inspectorLabel}>
                {t('set.alphaThreshold')}: <span className="ml-1 font-mono">{settings.alphaThreshold}</span>
                <Tooltip text={t('set.alphaThreshold.help')} label={t('set.alphaThreshold')} />
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={settings.alphaThreshold}
                onChange={(event) => updateSettings({ ...settings, alphaThreshold: Number(event.target.value) })}
                id="vectorize-alpha-threshold"
                className={inspectorRange}
                aria-labelledby="vectorize-alpha-threshold-label"
              />
            </div>
          )}
        </div>
      </div>

      <InspectorDisclosure
        title={t('vec.palette')}
        summary={paletteSummary}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      >
        <EditablePalette
          colors={paletteColors}
          selectedColor={selectedPaletteColor}
          onSelectColor={selectPaletteColor}
          onAddColor={addPaletteColor}
          onChangeSelectedColor={updateSelectedPaletteColor}
          onDeleteColor={deletePaletteColor}
          onMergeSimilar={mergeSimilarPaletteColors}
          onReset={resetPalette}
        />
      </InspectorDisclosure>

      {isLoading && (
        <p className="border-t border-border pt-3 text-xs text-ink-muted dark:border-dark-border dark:text-dark-ink-muted" aria-live="polite">
          {t('vec.vectorizing')}
        </p>
      )}
    </div>
  );
}
