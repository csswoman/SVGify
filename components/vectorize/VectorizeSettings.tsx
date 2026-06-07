'use client';

import { useState } from 'react';
import { VectorizeSettings, VECTORIZE_PRESETS } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n, type TKey } from '@/lib/i18n';

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

const PRESET_KEYS: Record<keyof typeof VECTORIZE_PRESETS, TKey> = {
  logo: 'set.preset.logo',
  sketch: 'set.preset.sketch',
  photo: 'set.preset.photo',
};

export function VectorizeSettingsPanel({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyPreset = (key: keyof typeof VECTORIZE_PRESETS) => {
    onSettingsChange({ ...settings, ...VECTORIZE_PRESETS[key] });
  };

  return (
    <div className="space-y-6">
      {/* ── Basic ── */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('set.basic')}</p>

        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('set.presets')}</p>
          <div className="flex flex-col gap-2">
            {(Object.keys(VECTORIZE_PRESETS) as Array<keyof typeof VECTORIZE_PRESETS>).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-gray-900 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm font-medium transition"
              >
                {t(PRESET_KEYS[key])}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.colors')}: <span className="font-mono ml-1">{settings.numberofcolors}</span>
            <Tooltip text={t('set.colors.help')} label={t('set.colors')} />
          </label>
          <input
            type="range"
            min={2}
            max={64}
            value={settings.numberofcolors}
            onChange={(e) =>
              onSettingsChange({ ...settings, numberofcolors: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.colors')}: ${settings.numberofcolors}`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.colors.hint')}</p>
        </div>
      </div>

      {/* ── Advanced (collapsible) ── */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center w-full text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide hover:text-gray-600 dark:hover:text-gray-300 transition"
          aria-expanded={showAdvanced}
        >
          <span className="mr-1">{showAdvanced ? '▾' : '▸'}</span>
          {t('set.advanced')}
        </button>

        {showAdvanced && (
          <div className="space-y-5 mt-4">
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.smoothing')}: <span className="font-mono ml-1">{settings.ltres.toFixed(1)}</span>
                <Tooltip text={t('set.smoothing.help')} label={t('set.smoothing')} />
              </label>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={settings.ltres}
                onChange={(e) => onSettingsChange({ ...settings, ltres: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.smoothing')}: ${settings.ltres}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.detail')}: <span className="font-mono ml-1">{settings.qtres.toFixed(1)}</span>
                <Tooltip text={t('set.detail.help')} label={t('set.detail')} />
              </label>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={settings.qtres}
                onChange={(e) => onSettingsChange({ ...settings, qtres: parseFloat(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.detail')}: ${settings.qtres}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.stroke')}: <span className="font-mono ml-1">{settings.strokewidth}</span>
                <Tooltip text={t('set.stroke.help')} label={t('set.stroke')} />
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={settings.strokewidth}
                onChange={(e) =>
                  onSettingsChange({ ...settings, strokewidth: Number(e.target.value) })
                }
                className="w-full accent-blue-600"
                aria-label={`${t('set.stroke')}: ${settings.strokewidth}`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.noise')}: <span className="font-mono ml-1">{settings.pathomit}</span>
                <Tooltip text={t('set.noise.help')} label={t('set.noise')} />
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={settings.pathomit}
                onChange={(e) => onSettingsChange({ ...settings, pathomit: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.noise')}: ${settings.pathomit}`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.noise.hint')}</p>
            </div>

            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('set.precision')}: <span className="font-mono ml-1">{settings.roundcoords}</span>
                <Tooltip text={t('set.precision.help')} label={t('set.precision')} />
              </label>
              <input
                type="range"
                min={0}
                max={3}
                value={settings.roundcoords}
                onChange={(e) => onSettingsChange({ ...settings, roundcoords: Number(e.target.value) })}
                className="w-full accent-blue-600"
                aria-label={`${t('set.precision')}: ${settings.roundcoords}`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.precision.hint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
