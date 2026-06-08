'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { removeBackground, type SeedPoint } from '@/lib/backgroundRemoval';
import { suggestPaletteFromImage } from '@/lib/paletteExtraction';

interface UseVectorizeSessionOptions {
  imageData: ImageData | null;
  onSvgReady?: (svg: string) => void;
}

export function useVectorizeSession({ imageData, onSvgReady }: UseVectorizeSessionOptions) {
  const [settings, setSettings] = useState<VectorizeSettings>(VECTORIZE_DEFAULTS);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(48);
  const [contiguous, setContiguous] = useState(true);
  const [seeds, setSeeds] = useState<SeedPoint[]>([]);
  const { svg, isLoading, error, vectorize } = useVectorizer();
  const hasAutoAdvanced = useRef(false);

  const updateSettings = useCallback((next: VectorizeSettings) => {
    setSettings({
      ...next,
      numberofcolors: Math.min(12, Math.max(2, next.numberofcolors)),
      pathomit: Math.max(12, Math.min(24, next.pathomit)),
      roundcoords: Math.max(2, next.roundcoords),
    });
  }, []);

  const processedImageData = useMemo(() => {
    if (!imageData) return null;
    if (!removeBg) return imageData;
    return removeBackground(imageData, {
      tolerance: bgTolerance,
      contiguous,
      seeds: seeds.length > 0 ? seeds : undefined,
    });
  }, [removeBg, imageData, bgTolerance, contiguous, seeds]);

  const suggestedPalette = useMemo(() => {
    if (!processedImageData) return [];
    return suggestPaletteFromImage(processedImageData, settings.numberofcolors).map(({ r, g, b }) => ({
      r,
      g,
      b,
    }));
  }, [processedImageData, settings.numberofcolors]);

  const settingsWithPalette = useMemo(
    () => ({
      ...settings,
      customPalette: suggestedPalette.map((color) => ({ ...color })),
    }),
    [settings, suggestedPalette]
  );

  const handlePick = useCallback((point: SeedPoint) => {
    setSeeds((prev) => [...prev, point]);
  }, []);

  useEffect(() => {
    hasAutoAdvanced.current = false;
  }, [imageData]);

  useEffect(() => {
    if (!processedImageData) return;
    const timer = setTimeout(() => vectorize(processedImageData, settingsWithPalette), 300);
    return () => clearTimeout(timer);
  }, [processedImageData, settingsWithPalette, vectorize]);

  useEffect(() => {
    if (!svg || !onSvgReady || hasAutoAdvanced.current) return;
    hasAutoAdvanced.current = true;
    onSvgReady(svg);
  }, [svg, onSvgReady]);

  return {
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
    handlePick,
    processedImageData,
    suggestedPalette,
    svg,
    isLoading,
    error,
  };
}
