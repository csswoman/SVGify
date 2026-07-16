'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeProductSettings, VECTORIZE_PRODUCT_DEFAULTS } from '@/types/svg.types';
import { applyVectorizeProfile } from '@/lib/vectorizeProfiles';
import { removeBackground, type SeedPoint } from '@/lib/backgroundRemoval';
import {
  mergeSimilarPaletteColors as mergeSuggestedPaletteColors,
  suggestFlatIconPaletteFromImage,
  suggestPaletteFromImage,
} from '@/lib/paletteExtraction';
import { useEditablePalette } from '@/hooks/useEditablePalette';

interface UseVectorizeSessionOptions {
  imageData: ImageData | null;
  /** When false, skips live re-vectorization (e.g. while editing the traced SVG). */
  enabled?: boolean;
}

export function useVectorizeSession({ imageData, enabled = true }: UseVectorizeSessionOptions) {
  const [settings, setSettings] = useState<VectorizeProductSettings>(VECTORIZE_PRODUCT_DEFAULTS);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(48);
  const [seeds, setSeeds] = useState<SeedPoint[]>([]);
  const { svg, isLoading, error, vectorize, cancel, clear } = useVectorizer();
  const {
    colors: paletteColors,
    selectedColor: selectedPaletteColor,
    replacePalette,
    selectColor: selectPaletteColor,
    addColor: addPaletteColor,
    updateSelectedColor: updateSelectedPaletteColor,
    deleteColor: deletePaletteColor,
    mergeSimilar: mergeSimilarPaletteColors,
  } = useEditablePalette();

  const updateSettings = useCallback((next: VectorizeProductSettings) => {
    setSettings({
      ...next,
      traceMode: next.traceMode === 'icon' ? 'icon' : 'standard',
      colorPrecision: Math.max(2, Math.min(7, Math.round(next.colorPrecision))),
      numberofcolors: 2 ** Math.max(2, Math.min(7, Math.round(next.colorPrecision))),
      cornerThreshold: Math.max(0, Math.min(180, Math.round(next.cornerThreshold))),
      bilateralRadius: Math.max(0, Math.min(3, Math.round(next.bilateralRadius))),
      alphaThreshold: Math.max(0, Math.min(255, Math.round(next.alphaThreshold))),
      colorQuantCycles: Math.max(1, Math.min(8, next.colorQuantCycles)),
    });
  }, []);

  const processedImageData = useMemo(() => {
    if (!imageData) return null;
    if (!removeBg) return imageData;
    return removeBackground(imageData, {
      tolerance: bgTolerance,
      // Background removal is deliberately topology-aware. A global color key
      // can erase enclosed artwork (for example, a light letter that happens
      // to match the canvas background).
      contiguous: true,
      seeds: seeds.length > 0 ? seeds : undefined,
    });
  }, [removeBg, imageData, bgTolerance, seeds]);

  const hasTranslucentEdges = useMemo(() => {
    if (!imageData) return false;
    for (let index = 3; index < imageData.data.length; index += 4) {
      const alpha = imageData.data[index];
      if (alpha > 0 && alpha < 255) return true;
    }
    return false;
  }, [imageData]);

  const resolvedSettings = useMemo(() => applyVectorizeProfile(settings), [settings]);

  const suggestedPalette = useMemo(() => {
    if (!processedImageData) return [];
    const suggestPalette = settings.traceMode === 'icon'
      ? suggestFlatIconPaletteFromImage
      : suggestPaletteFromImage;
    const palette = suggestPalette(processedImageData, settings.numberofcolors, settings.colorQuantCycles).map(({ r, g, b }) => ({
      r,
      g,
      b,
    }));

    return settings.traceMode === 'standard'
      ? mergeSuggestedPaletteColors(palette, resolvedSettings.paletteMergeThreshold)
      : palette;
  }, [
    processedImageData,
    settings.traceMode,
    settings.numberofcolors,
    settings.colorQuantCycles,
    resolvedSettings.paletteMergeThreshold,
  ]);

  useEffect(() => {
    replacePalette(suggestedPalette);
  }, [replacePalette, suggestedPalette]);

  const settingsWithPalette = useMemo(
    () => applyVectorizeProfile({
      ...settings,
      customPalette: paletteColors.map((color) => ({ ...color })),
    }),
    [settings, paletteColors]
  );

  const handlePick = useCallback((point: SeedPoint) => {
    setSeeds((prev) => [...prev, point]);
  }, []);

  useEffect(() => {
    clear();
  }, [processedImageData, clear]);

  useEffect(() => {
    if (!enabled || !processedImageData) return;
    cancel();
    const timer = setTimeout(() => vectorize(processedImageData, settingsWithPalette), 300);
    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [enabled, processedImageData, settingsWithPalette, vectorize, cancel]);

  return {
    settings,
    updateSettings,
    removeBg,
    setRemoveBg,
    bgTolerance,
    setBgTolerance,
    seeds,
    setSeeds,
    handlePick,
    processedImageData,
    hasTranslucentEdges,
    suggestedPalette,
    paletteColors,
    selectedPaletteColor,
    selectPaletteColor,
    addPaletteColor,
    updateSelectedPaletteColor,
    deletePaletteColor,
    mergeSimilarPaletteColors: () => mergeSimilarPaletteColors(64),
    resetPalette: () => replacePalette(suggestedPalette),
    svg,
    isLoading,
    error,
  };
}
