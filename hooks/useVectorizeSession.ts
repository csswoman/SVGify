'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { removeBackground, type SeedPoint } from '@/lib/backgroundRemoval';
import { suggestPaletteFromImage } from '@/lib/paletteExtraction';
import { useEditablePalette } from '@/hooks/useEditablePalette';

interface UseVectorizeSessionOptions {
  imageData: ImageData | null;
  /** When false, skips live re-vectorization (e.g. while editing the traced SVG). */
  enabled?: boolean;
}

export function useVectorizeSession({ imageData, enabled = true }: UseVectorizeSessionOptions) {
  const [settings, setSettings] = useState<VectorizeSettings>(VECTORIZE_DEFAULTS);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(48);
  const [contiguous, setContiguous] = useState(true);
  const [seeds, setSeeds] = useState<SeedPoint[]>([]);
  const { svg, isLoading, error, vectorize } = useVectorizer();
  const {
    colors: paletteColors,
    selectedColor: selectedPaletteColor,
    replacePalette,
    selectColor: selectPaletteColor,
    updateSelectedColor: updateSelectedPaletteColor,
    deleteColor: deletePaletteColor,
    mergeSimilar: mergeSimilarPaletteColors,
  } = useEditablePalette();

  const updateSettings = useCallback((next: VectorizeSettings) => {
    setSettings({
      ...next,
      numberofcolors: Math.min(24, Math.max(2, next.numberofcolors)),
      pathomit: Math.max(0, Math.min(40, next.pathomit)),
      linePathOmit: Math.max(0, Math.min(12, next.linePathOmit)),
      roundcoords: Math.max(0, Math.min(3, next.roundcoords)),
      blurRadius: Math.max(0, Math.min(5, next.blurRadius)),
      blurDelta: Math.max(1, Math.min(64, next.blurDelta)),
      traceScale: Math.max(1, Math.min(2, next.traceScale)),
      strokewidth: Math.max(0, Math.min(2, next.strokewidth)),
      fillOverlap: Math.max(0, Math.min(2, next.fillOverlap)),
      lineSmoothing: Math.max(0, Math.min(2, next.lineSmoothing)),
      curveSmoothing: Math.max(0, Math.min(2, next.curveSmoothing)),
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

  useEffect(() => {
    replacePalette(suggestedPalette);
  }, [replacePalette, suggestedPalette]);

  const settingsWithPalette = useMemo(
    () => ({
      ...settings,
      customPalette: paletteColors.map((color) => ({ ...color })),
    }),
    [settings, paletteColors]
  );

  const handlePick = useCallback((point: SeedPoint) => {
    setSeeds((prev) => [...prev, point]);
  }, []);

  useEffect(() => {
    if (!enabled || !processedImageData) return;
    const timer = setTimeout(() => vectorize(processedImageData, settingsWithPalette), 300);
    return () => clearTimeout(timer);
  }, [enabled, processedImageData, settingsWithPalette, vectorize]);

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
    paletteColors,
    selectedPaletteColor,
    selectPaletteColor,
    updateSelectedPaletteColor,
    deletePaletteColor,
    mergeSimilarPaletteColors: () => mergeSimilarPaletteColors(64),
    resetPalette: () => replacePalette(suggestedPalette),
    svg,
    isLoading,
    error,
  };
}
