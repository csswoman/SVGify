'use client';

import { VectorizeSettingsPanel } from '@/components/vectorize/VectorizeSettings';
import { EditablePalette } from '@/components/vectorize/EditablePalette';
import { WorkflowSteps } from '@/components/workspace/WorkflowSteps';
import { Tooltip } from '@/components/shared/Tooltip';
import { DownloadButton } from '@/components/shared/DownloadButton';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useI18n } from '@/lib/i18n';

interface VectorizeInspectorProps {
  session: ReturnType<typeof useVectorizeSession>;
  onContinueToEdit: () => void;
}

export function VectorizeInspector({ session, onContinueToEdit }: VectorizeInspectorProps) {
  const { t } = useI18n();
  const {
    settings,
    updateSettings,
    removeBg,
    setRemoveBg,
    bgTolerance,
    setBgTolerance,
    contiguous,
    setContiguous,
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
    svg,
    error,
    isLoading,
  } = session;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('vec.title')}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('vec.subtitle')}</p>
        </div>
        <WorkflowSteps activeStep={2} />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <VectorizeSettingsPanel settings={settings} onSettingsChange={updateSettings} />

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

      {svg && !isLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('vec.readyHint')}
        </p>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          {t('bg.remove')}
          <Tooltip text={t('bg.auto.help')} label={t('bg.remove')} />
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {seeds.length > 0 ? t('bg.picking') : t('bg.auto')}
        </p>
        {removeBg && (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={contiguous}
                onChange={(e) => setContiguous(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              {t('bg.contiguous')}
              <Tooltip text={t('bg.contiguous.help')} label={t('bg.contiguous')} />
            </label>
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
                className="focus-ring rounded text-sm text-blue-600 transition hover:text-blue-800"
              >
                ✕ {t('bg.clear')} ({seeds.length})
              </button>
            )}
          </>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        {isLoading ? t('vec.vectorizing') : t('vec.auto')}
      </p>

      {svg && !isLoading && (
        <div className="grid gap-2 sm:grid-cols-2">
          <DownloadButton
            svgString={svg}
            fileName="vectorized.svg"
            label={t('workspace.download')}
          />
          <button
            type="button"
            onClick={onContinueToEdit}
            className="focus-ring rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {t('vec.refineColors')}
          </button>
        </div>
      )}
    </div>
  );
}
