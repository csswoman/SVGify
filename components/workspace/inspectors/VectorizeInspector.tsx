'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import { VectorizeSettingsPanel } from '@/components/vectorize/VectorizeSettings';
import { EditablePalette } from '@/components/vectorize/EditablePalette';
import { WorkflowSteps } from '@/components/workspace/WorkflowSteps';
import { Tooltip } from '@/components/shared/Tooltip';
import type { useVectorizeSession } from '@/hooks/useVectorizeSession';
import { useI18n } from '@/lib/i18n';

interface VectorizeInspectorProps {
  session: ReturnType<typeof useVectorizeSession>;
  onContinueToEdit: () => void;
}

function InspectorSection({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-2 rounded py-1 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</span>
          {!open && summary ? (
            <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{summary}</span>
          ) : null}
        </span>
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

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(removeBg);

  useEffect(() => {
    if (removeBg) setBgOpen(true);
  }, [removeBg]);

  const paletteSummary =
    paletteColors.length === 1
      ? `1 ${t('vec.color')}`
      : `${paletteColors.length} ${t('vec.colors')}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('vec.title')}</h2>
        <WorkflowSteps activeStep={2} defaultCollapsed />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <VectorizeSettingsPanel settings={settings} onSettingsChange={updateSettings} />

      <InspectorSection
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
      </InspectorSection>

      <InspectorSection
        title={t('bg.remove')}
        summary={removeBg ? t('bg.on') : t('bg.off')}
        open={bgOpen}
        onOpenChange={setBgOpen}
      >
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
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {seeds.length > 0 ? t('bg.picking') : t('bg.auto')}
        </p>
        {removeBg && (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-blue-700 transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
              >
                <X size={14} weight="bold" aria-hidden />
                {t('bg.clear')} ({seeds.length})
              </button>
            )}
          </>
        )}
      </InspectorSection>

      {isLoading && (
        <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {t('vec.vectorizing')}
        </p>
      )}

      {svg && !isLoading && (
        <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('vec.readyHint')}</p>
          <button
            type="button"
            onClick={onContinueToEdit}
            className="focus-ring min-h-11 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60"
          >
            {t('vec.refineColors')}
          </button>
        </div>
      )}
    </div>
  );
}
