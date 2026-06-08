'use client';

import { useState } from 'react';
import { VectorizeSettings } from '@/types/svg.types';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeSettingsPanel({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const { t } = useI18n();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* ── Basic ── */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('set.basic')}</p>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.blur')}: <span className="font-mono ml-1">{settings.blurRadius}</span>
            <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={settings.blurRadius}
            onChange={(e) => onSettingsChange({ ...settings, blurRadius: Number(e.target.value) })}
            className="w-full accent-blue-600"
            aria-label={`${t('set.blur')}: ${settings.blurRadius}`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.blur.hint')}</p>
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.colors')}: <span className="font-mono ml-1">{settings.numberofcolors}</span>
            <Tooltip text={t('set.colors.help')} label={t('set.colors')} />
          </label>
          <input
            type="range"
            min={2}
            max={12}
            value={settings.numberofcolors}
            onChange={(e) =>
              onSettingsChange({ ...settings, numberofcolors: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`${t('set.colors')}: ${settings.numberofcolors}`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.colors.hint')}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            {t('set.icon.hint')}
          </p>
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
