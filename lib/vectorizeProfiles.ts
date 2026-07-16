import {
  VECTORIZE_DEFAULTS,
  type VectorizeDetailLevel,
  type VectorizeSettings,
} from '../types/svg.types';
import { ICON_MODE_SETTINGS, resolvePaletteMergeCeiling } from './iconModeSettings';

type ProfileOptions = Pick<
  VectorizeSettings,
  | 'filterSpeckle'
  | 'cornerThreshold'
  | 'pathPrecision'
  | 'layerDifference'
  | 'lengthThreshold'
  | 'maxIterations'
  | 'spliceThreshold'
  | 'preprocessingScale'
  | 'bilateralRadius'
  | 'bilateralColorSigma'
  | 'alphaThreshold'
>;

const STANDARD_PROFILES: Record<VectorizeDetailLevel, ProfileOptions> = {
  clean: {
    filterSpeckle: 12,
    cornerThreshold: 80,
    pathPrecision: 2,
    layerDifference: 18,
    lengthThreshold: 8,
    maxIterations: 2,
    spliceThreshold: 60,
    preprocessingScale: 1,
    bilateralRadius: 2,
    bilateralColorSigma: 32,
    alphaThreshold: 180,
  },
  balanced: {
    filterSpeckle: VECTORIZE_DEFAULTS.filterSpeckle,
    cornerThreshold: VECTORIZE_DEFAULTS.cornerThreshold,
    pathPrecision: VECTORIZE_DEFAULTS.pathPrecision,
    layerDifference: VECTORIZE_DEFAULTS.layerDifference,
    lengthThreshold: VECTORIZE_DEFAULTS.lengthThreshold,
    maxIterations: VECTORIZE_DEFAULTS.maxIterations,
    spliceThreshold: VECTORIZE_DEFAULTS.spliceThreshold,
    preprocessingScale: VECTORIZE_DEFAULTS.preprocessingScale,
    bilateralRadius: VECTORIZE_DEFAULTS.bilateralRadius,
    bilateralColorSigma: VECTORIZE_DEFAULTS.bilateralColorSigma,
    alphaThreshold: VECTORIZE_DEFAULTS.alphaThreshold,
  },
  detailed: {
    filterSpeckle: 2,
    cornerThreshold: 45,
    pathPrecision: 2,
    layerDifference: 6,
    lengthThreshold: 4,
    maxIterations: 2,
    spliceThreshold: 30,
    preprocessingScale: 1,
    bilateralRadius: 0,
    bilateralColorSigma: 32,
    alphaThreshold: 180,
  },
};

const ICON_PROFILES: Record<VectorizeDetailLevel, ProfileOptions> = {
  clean: {
    ...ICON_MODE_SETTINGS,
    filterSpeckle: 12,
    pathPrecision: 2,
    layerDifference: 18,
    maxIterations: 2,
    bilateralColorSigma: 32,
    alphaThreshold: 180,
    preprocessingScale: 1,
  },
  balanced: {
    ...ICON_MODE_SETTINGS,
    pathPrecision: 2,
    bilateralColorSigma: 32,
    alphaThreshold: 180,
    preprocessingScale: 1,
  },
  detailed: {
    ...ICON_MODE_SETTINGS,
    filterSpeckle: 1,
    pathPrecision: 2,
    layerDifference: 6,
    maxIterations: 2,
    bilateralColorSigma: 32,
    alphaThreshold: 180,
    preprocessingScale: 1,
  },
};

export function getVectorizeProfile(
  traceMode: VectorizeSettings['traceMode'],
  detailLevel: VectorizeDetailLevel
): ProfileOptions {
  return traceMode === 'icon'
    ? ICON_PROFILES[detailLevel]
    : STANDARD_PROFILES[detailLevel];
}

/**
 * Applies a product-level choice to the current settings. Keep this at the
 * UI boundary so the worker receives valid engine settings without exposing
 * VTracer's knobs to ordinary users.
 */
export function applyVectorizeProfile(
  settings: VectorizeSettings,
  changes: Partial<Pick<VectorizeSettings, 'traceMode' | 'detailLevel'>> = {}
): VectorizeSettings {
  const modeChanged = changes.traceMode !== undefined && changes.traceMode !== settings.traceMode;
  const next = {
    ...settings,
    ...changes,
    ...(modeChanged
      ? {
          colorPrecision: changes.traceMode === 'icon' ? 3 : VECTORIZE_DEFAULTS.colorPrecision,
        }
      : {}),
  };
  const profile = getVectorizeProfile(next.traceMode, next.detailLevel);
  const colorPrecision = Math.max(2, Math.min(7, Math.round(next.colorPrecision)));
  const numberofcolors = 2 ** colorPrecision;

  return {
    ...next,
    ...profile,
    colorPrecision,
    numberofcolors,
    maxIterations: Math.max(1, profile.maxIterations),
    paletteMergeThreshold: next.traceMode === 'standard'
      ? Math.min(next.paletteMergeThreshold, resolvePaletteMergeCeiling(numberofcolors))
      : next.paletteMergeThreshold,
  };
}
