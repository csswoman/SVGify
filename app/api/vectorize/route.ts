import {
  ColorMode,
  Hierarchical,
  PathSimplifyMode,
  vectorizeRaw,
  type Config as VTracerConfig,
} from '@neplex/vectorizer';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { optimizeSvg } from '@/lib/optimizeSvg';
import { reduceSvgStringColorsToCount, simplifyColors } from '@/lib/colorUtils';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';

export const runtime = 'nodejs';

function clampInt(value: unknown, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function parseSettings(raw: FormDataEntryValue | null): VectorizeSettings {
  if (typeof raw !== 'string') return VECTORIZE_DEFAULTS;

  try {
    const parsed = JSON.parse(raw) as Partial<VectorizeSettings>;
    return { ...VECTORIZE_DEFAULTS, ...parsed };
  } catch {
    return VECTORIZE_DEFAULTS;
  }
}

function toVTracerConfig(settings: VectorizeSettings): VTracerConfig {
  return {
    colorMode: ColorMode.Color,
    hierarchical: Hierarchical.Stacked,
    mode: PathSimplifyMode.Spline,
    colorPrecision: clampInt(settings.colorPrecision, 1, 8),
    filterSpeckle: clampInt(settings.filterSpeckle, 0, 40),
    cornerThreshold: clampInt(settings.cornerThreshold, 0, 180),
    pathPrecision: clampInt(settings.pathPrecision, 0, 8),
    layerDifference: clampInt(settings.layerDifference, 0, 64),
    lengthThreshold: clampInt(settings.lengthThreshold, 1, 32),
    maxIterations: clampInt(settings.maxIterations, 0, 10),
    spliceThreshold: clampInt(settings.spliceThreshold, 0, 180),
  };
}

function jsonResponse(request: Request, payload: unknown, status = 200): Response {
  const json = JSON.stringify(payload);
  const acceptEncoding = request.headers.get('accept-encoding') ?? '';
  const headers = new Headers({
    'content-type': 'application/json',
    vary: 'Accept-Encoding',
  });

  if (acceptEncoding.includes('br')) {
    headers.set('content-encoding', 'br');
    return new Response(brotliCompressSync(json), { status, headers });
  }

  if (acceptEncoding.includes('gzip')) {
    headers.set('content-encoding', 'gzip');
    return new Response(gzipSync(json), { status, headers });
  }

  return new Response(json, { status, headers });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const width = clampInt(formData.get('width'), 1, 16_384);
    const height = clampInt(formData.get('height'), 1, 16_384);
    const pixels = formData.get('pixels');

    if (!(pixels instanceof File)) {
      return jsonResponse(request, { error: 'Missing raw RGBA pixel buffer' }, 400);
    }

    const source = Buffer.from(await pixels.arrayBuffer());
    if (source.byteLength !== width * height * 4) {
      return jsonResponse(request, { error: 'Raw RGBA buffer size does not match dimensions' }, 400);
    }

    const settings = parseSettings(formData.get('settings'));
    const rawSvg = await vectorizeRaw(source, { width, height }, toVTracerConfig(settings));
    const mergedPaletteSvg = simplifyColors(
      rawSvg,
      clampInt(settings.paletteMergeThreshold, 0, 128)
    );
    const paletteCappedSvg = reduceSvgStringColorsToCount(
      mergedPaletteSvg,
      clampInt(settings.numberofcolors, 2, 256)
    );
    const svg = optimizeSvg(paletteCappedSvg, {
      removeStroke: true,
      dropDefaultOpacity: true,
      coordDecimals: clampInt(settings.pathPrecision, 0, 8),
      mergePaths: false,
      splitCompoundPaths: true,
    });

    return jsonResponse(request, { svg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vectorization failed';
    return jsonResponse(request, { error: message }, 500);
  }
}
