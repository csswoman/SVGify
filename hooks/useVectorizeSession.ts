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
    addColor: addPaletteColor,
    updateSelectedColor: updateSelectedPaletteColor,
    deleteColor: deletePaletteColor,
    mergeSimilar: mergeSimilarPaletteColors,
  } = useEditablePalette();

  const updateSettings = useCallback((next: VectorizeSettings) => {
    setSettings({
      ...next,
      colorPrecision: Math.max(1, Math.min(8, Math.round(next.colorPrecision))),
      numberofcolors: 2 ** Math.max(1, Math.min(8, Math.round(next.colorPrecision))),
      filterSpeckle: Math.max(0, Math.min(40, Math.round(next.filterSpeckle))),
      cornerThreshold: Math.max(0, Math.min(180, Math.round(next.cornerThreshold))),
      pathPrecision: Math.max(0, Math.min(8, Math.round(next.pathPrecision))),
      layerDifference: Math.max(0, Math.min(64, Math.round(next.layerDifference))),
      lengthThreshold: Math.max(1, Math.min(32, Math.round(next.lengthThreshold))),
      maxIterations: Math.max(0, Math.min(10, Math.round(next.maxIterations))),
      spliceThreshold: Math.max(0, Math.min(180, Math.round(next.spliceThreshold))),
      preprocessingScale: Math.max(1, Math.min(2, Math.round(next.preprocessingScale))),
      bilateralRadius: Math.max(0, Math.min(3, Math.round(next.bilateralRadius))),
      bilateralColorSigma: Math.max(1, Math.min(96, Math.round(next.bilateralColorSigma))),
      alphaThreshold: Math.max(0, Math.min(255, Math.round(next.alphaThreshold))),
      paletteMergeThreshold: Math.max(0, Math.min(128, Math.round(next.paletteMergeThreshold))),
      colorQuantCycles: Math.max(1, Math.min(8, next.colorQuantCycles)),
      pathomit: Math.max(0, Math.min(40, next.filterSpeckle)),
      linePathOmit: Math.max(0, Math.min(12, next.linePathOmit)),
      roundcoords: Math.max(0, Math.min(8, next.pathPrecision)),
      blurRadius: Math.max(0, Math.min(3, next.bilateralRadius)),
      blurDelta: Math.max(1, Math.min(64, next.blurDelta)),
      traceScale: Math.max(1, Math.min(2, next.preprocessingScale)),
      strokewidth: 0,
      fillOverlap: 0,
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
    return suggestPaletteFromImage(processedImageData, settings.numberofcolors, settings.colorQuantCycles).map(({ r, g, b }) => ({
      r,
      g,
      b,
    }));
  }, [processedImageData, settings.numberofcolors, settings.colorQuantCycles]);

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
