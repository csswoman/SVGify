'use client';

import { useState, useCallback, useEffect } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { VectorizeSettingsPanel } from './VectorizeSettings';
import { ImagePreview } from './ImagePreview';
import { SvgPreview } from './SvgPreview';
import { LoadingState } from '@/components/shared/LoadingState';
import { DownloadButton } from '@/components/shared/DownloadButton';

interface VectorizeStepProps {
  imageData: ImageData;
  onVectorizeComplete: (svgString: string) => void;
}

export function VectorizeStep({ imageData, onVectorizeComplete }: VectorizeStepProps) {
  const [settings, setSettings] = useState<VectorizeSettings>(VECTORIZE_DEFAULTS);
  const { svg, isLoading, error, vectorize } = useVectorizer();

  const handleVectorize = useCallback(() => {
    vectorize(imageData, settings);
  }, [imageData, settings, vectorize]);

  // Auto-vectorize with defaults as soon as the image arrives
  useEffect(() => {
    vectorize(imageData, VECTORIZE_DEFAULTS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Vectorize</h1>
        <p className="text-gray-500">
          {svg
            ? 'Adjust settings and click Vectorize to re-run, or continue.'
            : 'Adjust settings and click Vectorize to convert your image.'}
        </p>
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
            <ImagePreview imageData={imageData} label="Original" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vector SVG</p>
              <SvgPreview svgString={svg} />
            </div>
          </div>

          {svg && (
            <div className="flex gap-3 pt-2">
              <DownloadButton svgString={svg} fileName="vectorized.svg" />
              <button
                onClick={() => onVectorizeComplete(svg)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continue to Colors →
              </button>
            </div>
          )}
        </div>

        {/* Right: settings panel */}
        <div className="space-y-6">
          <VectorizeSettingsPanel settings={settings} onSettingsChange={setSettings} />
          <button
            onClick={handleVectorize}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Vectorizing…' : 'Vectorize'}
          </button>
        </div>
      </div>

      <LoadingState isLoading={isLoading} message="Vectorizing image…" />
    </div>
  );
}
