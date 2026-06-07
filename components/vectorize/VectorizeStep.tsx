'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { removeBackground, type SeedPoint } from '@/lib/backgroundRemoval';
import { svgByteSize, formatBytes, optimizeSvg } from '@/lib/optimizeSvg';
import { simplifySvgPaths, countPaths } from '@/lib/simplifyPath';
import { VectorizeSettingsPanel } from './VectorizeSettings';
import { ImagePreview } from './ImagePreview';
import { SvgPreview } from './SvgPreview';
import { PalettePreview } from './PalettePreview';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { Tooltip } from '@/components/shared/Tooltip';
import { useI18n } from '@/lib/i18n';

interface VectorizeStepProps {
  imageData: ImageData;
  onVectorizeComplete: (svgString: string) => void;
}

export function VectorizeStep({ imageData, onVectorizeComplete }: VectorizeStepProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<VectorizeSettings>(VECTORIZE_DEFAULTS);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(48);
  // true = only the connected region (flood-fill); false = every matching pixel (global).
  const [contiguous, setContiguous] = useState(true);
  // User-picked background points. Empty = auto (estimate from corners).
  const [seeds, setSeeds] = useState<SeedPoint[]>([]);
  const { svg, isLoading, error, vectorize } = useVectorizer();
  // Optional max-optimized version (Douglas–Peucker). Cleared on re-vectorize.
  const [optimizedSvg, setOptimizedSvg] = useState<string | null>(null);

  // The SVG actually shown / downloaded: the optimized one if present.
  const activeSvg = optimizedSvg ?? svg;

  // The raster fed to the tracer: background removed (if enabled) or the original.
  const processedImageData = useMemo(() => {
    if (!removeBg) return imageData;
    return removeBackground(imageData, {
      tolerance: bgTolerance,
      contiguous,
      seeds: seeds.length > 0 ? seeds : undefined,
    });
  }, [removeBg, imageData, bgTolerance, contiguous, seeds]);

  const handlePick = useCallback((point: SeedPoint) => {
    setSeeds((prev) => [...prev, point]);
  }, []);

  const handleVectorize = useCallback(() => {
    vectorize(processedImageData, settings);
  }, [processedImageData, settings, vectorize]);

  // Dynamic, debounced re-vectorize: whenever the settings or the processed
  // raster (background removal) change, re-run automatically so both previews
  // and the palette reflect the chosen settings without a manual click.
  // The first run happens here too (on mount), so no separate init effect.
  useEffect(() => {
    const t = setTimeout(() => vectorize(processedImageData, settings), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedImageData, settings]);

  // A fresh vectorization invalidates any prior max-optimization.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived optimization when the source SVG changes
    setOptimizedSvg(null);
  }, [svg]);

  // "Optimize to the max": flatten curves + drop points with Douglas–Peucker.
  const handleMaxOptimize = useCallback(() => {
    if (!svg) return;
    setOptimizedSvg(
      optimizeSvg(simplifySvgPaths(svg, 1.2, 0), { compressPaths: true, sealSeams: 1 })
    );
  }, [svg]);

  const pathCount = useMemo(() => (svg ? countPaths(svg) : 0), [svg]);
  const isComplex = pathCount > 1500; // likely a photo → poor SVG candidate

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t('vec.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('vec.subtitle')}</p>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: original + SVG side by side */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ImagePreview
              imageData={processedImageData}
              label={removeBg ? t('vec.originalPick') : t('vec.original')}
              onPick={removeBg ? handlePick : undefined}
              seeds={removeBg ? seeds : undefined}
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('vec.vector')}{activeSvg && <span className="ml-2 normal-case font-normal text-gray-400 dark:text-gray-500">({formatBytes(svgByteSize(activeSvg))})</span>}
                {optimizedSvg && <span className="ml-1 normal-case font-normal text-green-600">· {t('vec.optimized')}</span>}
              </p>
              <SvgPreview svgString={activeSvg} />
            </div>
          </div>

          <PalettePreview svg={activeSvg} />

          {isComplex && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              {t('vec.complexWarn')}
            </div>
          )}

          {svg && (
            <div className="flex flex-wrap gap-3 pt-2 items-center">
              <DownloadButton svgString={activeSvg} fileName="vectorized.svg" label={t('vec.download')} />
              <button
                onClick={() => activeSvg && onVectorizeComplete(activeSvg)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {t('vec.continue')}
              </button>
              <button
                onClick={handleMaxOptimize}
                disabled={!!optimizedSvg}
                className="px-5 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                {t('vec.maxOptimize')}
                <Tooltip text={t('vec.maxOptimize.help')} label={t('vec.maxOptimize')} />
              </button>
            </div>
          )}
        </div>

        {/* Right: settings panel */}
        <div className="space-y-6">
          <VectorizeSettingsPanel settings={settings} onSettingsChange={setSettings} />

          <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => setRemoveBg(e.target.checked)}
                className="accent-blue-600 h-4 w-4"
              />
              {t('bg.remove')}
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {seeds.length > 0 ? t('bg.picking') : t('bg.auto')}
            </p>
            {removeBg && (
              <>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contiguous}
                    onChange={(e) => setContiguous(e.target.checked)}
                    className="accent-blue-600 h-4 w-4"
                  />
                  {t('bg.contiguous')}
                  <Tooltip text={t('bg.contiguous.help')} label={t('bg.contiguous')} />
                </label>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('bg.tolerance')}: <span className="font-mono ml-1">{bgTolerance}</span>
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('bg.tolerance.hint')}</p>
                </div>
                {seeds.length > 0 && (
                  <button
                    onClick={() => setSeeds([])}
                    className="text-sm text-blue-600 hover:text-blue-800 transition"
                  >
                    ✕ {t('bg.clear')} ({seeds.length})
                  </button>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleVectorize}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? t('vec.vectorizing') : t('vec.revectorize')}
          </button>
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">{t('vec.auto')}</p>
        </div>
      </div>
    </div>
  );
}
