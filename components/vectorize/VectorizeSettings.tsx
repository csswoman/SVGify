'use client';

import { useState } from 'react';
import { VECTORIZE_DEFAULTS, VectorizeSettings } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeSettingsPanel({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const setColorPrecision = (colorPrecision: number) => {
    onSettingsChange({ ...settings, colorPrecision, numberofcolors: 2 ** colorPrecision });
  };
  const setTraceMode = (traceMode: VectorizeSettings['traceMode']) => {
    if (traceMode === settings.traceMode) return;
    if (traceMode === 'icon') {
      onSettingsChange({
        ...settings,
        traceMode,
        colorPrecision: 2,
        numberofcolors: 4,
        filterSpeckle: 8,
        pathomit: 8,
        cornerThreshold: 95,
        pathPrecision: 1,
        roundcoords: 1,
        paletteMergeThreshold: 64,
        bilateralRadius: 1,
        blurRadius: 1,
        layerDifference: 18,
        lengthThreshold: 10,
        maxIterations: 3,
        spliceThreshold: 75,
        fillOverlap: 1,
        lineSmoothing: 1,
        curveSmoothing: 1,
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

  return (
    <div className="space-y-6">
      {/* ── Basic ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('set.basic')}</p>

        <div>
          <label className="mb-1 flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('set.traceMode')}
            <Tooltip text={t('set.traceMode.help')} label={t('set.traceMode')} />
          </label>
          <div className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setTraceMode('standard')}
              className={`focus-ring rounded-md px-3 py-2 font-semibold transition ${
                settings.traceMode === 'standard'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t('set.traceMode.standard')}
            </button>
            <button
              type="button"
              onClick={() => setTraceMode('icon')}
              className={`focus-ring rounded-md px-3 py-2 font-semibold transition ${
                settings.traceMode === 'icon'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t('set.traceMode.icon')}
            </button>
          </div>
          {settings.traceMode === 'icon' && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('set.traceMode.icon.help')}</p>
          )}
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.blur')}: <span className="font-mono ml-1">{settings.bilateralRadius}</span>
            <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={settings.bilateralRadius}
            onChange={(e) => onSettingsChange({ ...settings, bilateralRadius: Number(e.target.value), blurRadius: Number(e.target.value) })}
            className="w-full accent-blue-600"
            aria-label={`${t('set.blur')}: ${settings.bilateralRadius}`}
          />
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.colorPrecision')}: <span className="font-mono ml-1">{2 ** settings.colorPrecision}</span>
            <Tooltip text={t('set.colors.help')} label={t('set.colors')} />
          </label>
          <input
            type="range"
            min={2}
            max={128}
            step={1}
            value={2 ** settings.colorPrecision}
            onChange={(e) =>
              setColorPrecision(Math.round(Math.log2(Number(e.target.value))))
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.colorPrecision')}: ${2 ** settings.colorPrecision}`}
          />
        </div>
      </div>

      {/* ── Advanced (collapsible) ── */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="focus-ring flex w-full items-center text-xs font-semibold text-gray-600 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-expanded={showAdvanced}
        >
          <span className="mr-1">{showAdvanced ? '▾' : '▸'}</span>
          {t('set.advanced')}
        </button>

        {showAdvanced && (
          <div className="space-y-5 mt-4">
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.colorPrecision')}: <span className="font-mono ml-1">{2 ** settings.colorPrecision}</span>
                <Tooltip text={t('set.colorPrecision.help')} label={t('set.colorPrecision')} />
              </label>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={settings.colorPrecision}
                onChange={(e) => setColorPrecision(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label={`${t('set.colorPrecision')}: ${2 ** settings.colorPrecision}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.noise')}: <span className="font-mono ml-1">{settings.filterSpeckle}</span>
                <Tooltip text={t('set.noise.help')} label={t('set.noise')} />
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={settings.filterSpeckle}
                onChange={(e) => onSettingsChange({ ...settings, filterSpeckle: Number(e.target.value), pathomit: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.noise')}: ${settings.filterSpeckle}`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.noise.hint')}</p>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.cornerThreshold')}: <span className="font-mono ml-1">{settings.cornerThreshold}</span>
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

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.precision')}: <span className="font-mono ml-1">{settings.pathPrecision}</span>
                <Tooltip text={t('set.precision.help')} label={t('set.precision')} />
              </label>
              <input
                type="range"
                min={0}
                max={8}
                value={settings.pathPrecision}
                onChange={(e) => onSettingsChange({ ...settings, pathPrecision: Number(e.target.value), roundcoords: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.precision')}: ${settings.pathPrecision}`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.precision.hint')}</p>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.traceScale')}: <span className="font-mono ml-1">{settings.preprocessingScale}x</span>
                <Tooltip text={t('set.traceScale.help')} label={t('set.traceScale')} />
              </label>
              <input
                type="range"
                min={1}
                max={2}
                step={1}
                value={settings.preprocessingScale}
                onChange={(e) => onSettingsChange({ ...settings, preprocessingScale: Number(e.target.value), traceScale: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.traceScale')}: ${settings.preprocessingScale}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.blur')}: <span className="font-mono ml-1">{settings.bilateralRadius}</span>
                <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
              </label>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={settings.bilateralRadius}
                onChange={(e) => onSettingsChange({ ...settings, bilateralRadius: Number(e.target.value), blurRadius: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.blur')}: ${settings.bilateralRadius}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.bilateralSigma')}: <span className="font-mono ml-1">{settings.bilateralColorSigma}</span>
                <Tooltip text={t('set.bilateralSigma.help')} label={t('set.bilateralSigma')} />
              </label>
              <input
                type="range"
                min={1}
                max={96}
                value={settings.bilateralColorSigma}
                onChange={(e) => onSettingsChange({ ...settings, bilateralColorSigma: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.bilateralSigma')}: ${settings.bilateralColorSigma}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.alphaThreshold')}: <span className="font-mono ml-1">{settings.alphaThreshold}</span>
                <Tooltip text={t('set.alphaThreshold.help')} label={t('set.alphaThreshold')} />
              </label>
              <input
                type="range"
                min={0}
                max={255}
                value={settings.alphaThreshold}
                onChange={(e) => onSettingsChange({ ...settings, alphaThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.alphaThreshold')}: ${settings.alphaThreshold}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.paletteMerge')}: <span className="font-mono ml-1">{settings.paletteMergeThreshold}</span>
                <Tooltip text={t('set.paletteMerge.help')} label={t('set.paletteMerge')} />
              </label>
              <input
                type="range"
                min={0}
                max={128}
                value={settings.paletteMergeThreshold}
                onChange={(e) => onSettingsChange({ ...settings, paletteMergeThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.paletteMerge')}: ${settings.paletteMergeThreshold}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.layerDifference')}: <span className="font-mono ml-1">{settings.layerDifference}</span>
                <Tooltip text={t('set.layerDifference.help')} label={t('set.layerDifference')} />
              </label>
              <input
                type="range"
                min={0}
                max={64}
                value={settings.layerDifference}
                onChange={(e) => onSettingsChange({ ...settings, layerDifference: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.layerDifference')}: ${settings.layerDifference}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.lengthThreshold')}: <span className="font-mono ml-1">{settings.lengthThreshold}</span>
                <Tooltip text={t('set.lengthThreshold.help')} label={t('set.lengthThreshold')} />
              </label>
              <input
                type="range"
                min={1}
                max={32}
                step={1}
                value={settings.lengthThreshold}
                onChange={(e) => onSettingsChange({ ...settings, lengthThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.lengthThreshold')}: ${settings.lengthThreshold}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.maxIterations')}: <span className="font-mono ml-1">{settings.maxIterations}</span>
                <Tooltip text={t('set.maxIterations.help')} label={t('set.maxIterations')} />
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={settings.maxIterations}
                onChange={(e) => onSettingsChange({ ...settings, maxIterations: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.maxIterations')}: ${settings.maxIterations}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.spliceThreshold')}: <span className="font-mono ml-1">{settings.spliceThreshold}</span>
                <Tooltip text={t('set.spliceThreshold.help')} label={t('set.spliceThreshold')} />
              </label>
              <input
                type="range"
                min={0}
                max={180}
                step={5}
                value={settings.spliceThreshold}
                onChange={(e) => onSettingsChange({ ...settings, spliceThreshold: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.spliceThreshold')}: ${settings.spliceThreshold}`}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
