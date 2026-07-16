'use client';

import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { VectorizeSettingsPanel } from '@/components/vectorize/VectorizeSettings';
import { EditablePalette } from '@/components/vectorize/EditablePalette';
import { InspectorDisclosure } from '@/components/workspace/InspectorDisclosure';
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
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('vec.title')}</h2>
          <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">{t('vec.subtitle')}</p>
        </div>

        {!hasSvg ? (
          <p className="text-pretty text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
            {isLoading ? t('onboard.traceAction') : t('onboard.vectorizeCue')}
          </p>
        ) : null}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <VectorizeSettingsPanel
        settings={settings}
        onSettingsChange={updateSettings}
      />

      <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          {t('bg.remove')}
          <Tooltip text={t('bg.auto.help')} label={t('bg.remove')} />
        </label>

        {removeBg && (
          <>
            {seeds.length > 0 ? (
              <p className="text-pretty text-xs text-gray-500 dark:text-gray-400">{t('bg.picking')}</p>
            ) : null}
            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('bg.tolerance')}: <span className="ml-1 font-mono">{bgTolerance}</span>
                <Tooltip text={t('bg.tolerance.help')} label={t('bg.tolerance')} />
              </label>
              <input
                type="range"
                min={0}
                max={128}
                value={bgTolerance}
                onChange={(e) => setBgTolerance(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label={`${t('bg.tolerance')}: ${bgTolerance}`}
              />
            </div>
            {seeds.length > 0 && (
              <button
                type="button"
                onClick={() => setSeeds([])}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-blue-700 transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
              >
                <X size={14} weight="bold" aria-hidden />
                {t('bg.clear')} ({seeds.length})
              </button>
            )}
          </>
        )}

        {hasTranslucentEdges && (
          <div>
            <label className="mb-1 flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('set.alphaThreshold')}: <span className="ml-1 font-mono">{settings.alphaThreshold}</span>
              <Tooltip text={t('set.alphaThreshold.help')} label={t('set.alphaThreshold')} />
            </label>
            <input
              type="range"
              min={0}
              max={255}
              value={settings.alphaThreshold}
              onChange={(event) => updateSettings({ ...settings, alphaThreshold: Number(event.target.value) })}
              className="w-full accent-blue-600"
              aria-label={`${t('set.alphaThreshold')}: ${settings.alphaThreshold}`}
            />
          </div>
        )}
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
        <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {t('vec.vectorizing')}
        </p>
      )}
    </div>
  );
}
