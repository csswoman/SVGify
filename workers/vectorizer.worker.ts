import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { applyAlphaThreshold, applyBilateralFilter, upscaleImageData } from '@/lib/imageFilters';

self.postMessage({ type: 'ready' } satisfies WorkerResponse);

let activeRequestId = 0;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, settings, requestId } = event.data;

  if (type === 'cancel') {
    activeRequestId += 1;
    return;
  }

  if (type === 'vectorize' && imageData && settings) {
    const jobId = requestId ?? ++activeRequestId;
    activeRequestId = jobId;
    void vectorizeImage(imageData, settings, jobId);
  }
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeSettings(settings: VectorizeSettings): VectorizeSettings {
  const merged = { ...VECTORIZE_DEFAULTS, ...settings };
  const colorPrecision = clampInt(
    Number.isFinite(merged.colorPrecision) ? merged.colorPrecision : Math.round(Math.log2(Math.max(2, merged.numberofcolors))),
    1,
    8
  );
  const filterSpeckle = clampInt(
    Number.isFinite(merged.filterSpeckle) ? merged.filterSpeckle : merged.pathomit,
    0,
    40
  );
  const pathPrecision = clampInt(
    Number.isFinite(merged.pathPrecision) ? merged.pathPrecision : merged.roundcoords,
    0,
    8
  );
  const preprocessingScale = clampInt(
    Number.isFinite(merged.preprocessingScale) ? merged.preprocessingScale : merged.traceScale,
    1,
    2
  );
  const bilateralRadius = clampInt(
    Number.isFinite(merged.bilateralRadius) ? merged.bilateralRadius : merged.blurRadius,
    0,
    3
  );

  return {
    ...merged,
    numberofcolors: 2 ** colorPrecision,
    colorPrecision,
    filterSpeckle,
    pathPrecision,
    preprocessingScale,
    bilateralRadius,
    bilateralColorSigma: clampInt(merged.bilateralColorSigma, 1, 96),
    alphaThreshold: clampInt(merged.alphaThreshold, 0, 255),
    paletteMergeThreshold: clampInt(merged.paletteMergeThreshold, 0, 128),
    cornerThreshold: clampInt(merged.cornerThreshold, 0, 180),
    layerDifference: clampInt(merged.layerDifference, 0, 64),
    lengthThreshold: clampInt(merged.lengthThreshold, 1, 32),
    maxIterations: clampInt(merged.maxIterations, 0, 10),
    spliceThreshold: clampInt(merged.spliceThreshold, 0, 180),
    pathomit: filterSpeckle,
    roundcoords: pathPrecision,
    traceScale: preprocessingScale,
    blurRadius: bilateralRadius,
  };
}

function preprocessForVTracer(imageData: ImageData, settings: VectorizeSettings): ImageData {
  const upscaled = upscaleImageData(imageData, settings.preprocessingScale);
  const alphaCleaned = applyAlphaThreshold(upscaled, settings.alphaThreshold);
  return applyBilateralFilter(alphaCleaned, settings.bilateralRadius, settings.bilateralColorSigma);
}

async function vectorizeImage(imageData: ImageData, settings: VectorizeSettings, requestId: number): Promise<void> {
  try {
    const options = normalizeSettings(settings);
    const source = preprocessForVTracer(imageData, options);
    const body = new FormData();
    body.set('width', String(source.width));
    body.set('height', String(source.height));
    body.set('settings', JSON.stringify(options));
    body.set('pixels', new Blob([source.data], { type: 'application/octet-stream' }));

    const response = await fetch('/api/vectorize', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(error?.error ?? `Vectorization failed with HTTP ${response.status}`);
    }

    const { svg: optimized } = await response.json() as { svg?: string };
    if (!optimized) throw new Error('Vectorization did not return an SVG');

    if (requestId !== activeRequestId) return;
    self.postMessage({ type: 'done', svg: optimized, requestId } satisfies WorkerResponse);
  } catch (err) {
    if (requestId !== activeRequestId) return;
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message, requestId } satisfies WorkerResponse);
  }
}
