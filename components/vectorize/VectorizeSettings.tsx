'use client';

import { VectorizeSettings, VECTORIZE_PRESETS } from '@/types/svg.types';

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

const PRESET_LABELS: Record<keyof typeof VECTORIZE_PRESETS, string> = {
  logo: 'Logo / Flat color',
  sketch: 'Sketch / Line art',
  photo: 'Photo',
};

export function VectorizeSettingsPanel({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const applyPreset = (key: keyof typeof VECTORIZE_PRESETS) => {
    onSettingsChange({ ...settings, ...VECTORIZE_PRESETS[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Presets</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(VECTORIZE_PRESETS) as Array<keyof typeof VECTORIZE_PRESETS>).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm font-medium transition"
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Colors: <span className="font-mono">{settings.numberofcolors}</span>
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
            aria-label={`Number of colors: ${settings.numberofcolors}`}
          />
          <p className="text-xs text-gray-400 mt-1">Fewer = simpler shapes · More = detailed</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Smoothing: <span className="font-mono">{settings.ltres.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={settings.ltres}
            onChange={(e) =>
              onSettingsChange({ ...settings, ltres: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`Smoothing: ${settings.ltres}`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Detail: <span className="font-mono">{settings.qtres.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={settings.qtres}
            onChange={(e) =>
              onSettingsChange({ ...settings, qtres: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600"
            aria-label={`Detail: ${settings.qtres}`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Stroke width: <span className="font-mono">{settings.strokewidth}</span>
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
            aria-label={`Stroke width: ${settings.strokewidth}`}
          />
        </div>
      </div>
    </div>
  );
}
