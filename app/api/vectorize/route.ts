import {
  ColorMode,
  Hierarchical,
  PathSimplifyMode,
  vectorizeRaw,
  type Config as VTracerConfig,
} from '@neplex/vectorizer';
import { brotliCompressSync, gunzipSync, gzipSync } from 'node:zlib';
import { finalizeTracedSvg } from '@/lib/finalizeTracedSvg';
import { resolveTraceColorPrecision, resolveTraceSmallCircle } from '@/lib/iconModeSettings';
import { decodeVectorizePayload, VECTORIZE_PAYLOAD_CONTENT_TYPE } from '@/lib/vectorizePayload';
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
    // Flat icons are already posterized to exact palette regions. Cutouts keep
    // the background from being emitted again as small stacked fragments over
    // foreground shapes; Standard artwork still benefits from stacked layers.
    hierarchical: settings.traceMode === 'icon'
      ? Hierarchical.Cutout
      : Hierarchical.Stacked,
    // Flat logos need boundary-faithful polygons; post-processing rounds only
    // the appropriate large shapes. Standard artwork keeps spline fitting,
    // while its selected palette is enforced during raster preprocessing.
    mode: settings.traceMode === 'icon' ? PathSimplifyMode.Polygon : PathSimplifyMode.Spline,
    colorPrecision: resolveTraceColorPrecision(settings),
    filterSpeckle: clampInt(settings.filterSpeckle, 0, 40),
    cornerThreshold: clampInt(settings.cornerThreshold, 0, 180),
    pathPrecision: clampInt(settings.pathPrecision, 0, 8),
    layerDifference: clampInt(settings.layerDifference, 0, 64),
    lengthThreshold: clampInt(settings.lengthThreshold, 1, 32),
    maxIterations: clampInt(settings.maxIterations, 1, 10),
    spliceThreshold: clampInt(settings.spliceThreshold, 0, 180),
    smallCircle: resolveTraceSmallCircle(settings.traceMode),
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
    if (request.headers.get('content-type') === VECTORIZE_PAYLOAD_CONTENT_TYPE) {
      const compressed = Buffer.from(await request.arrayBuffer());
      const decoded = decodeVectorizePayload(gunzipSync(compressed));
      const source = Buffer.from(
        decoded.pixels.buffer,
        decoded.pixels.byteOffset,
        decoded.pixels.byteLength
      );
      const rawSvg = await vectorizeRaw(
        source,
        { width: decoded.width, height: decoded.height },
        toVTracerConfig(decoded.settings)
      );
      const svg = finalizeTracedSvg(rawSvg, decoded.settings);

      return jsonResponse(request, { svg });
    }

    // Keep accepting the previous multipart transport during rolling deploys.
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
    const svg = finalizeTracedSvg(rawSvg, settings);

    return jsonResponse(request, { svg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vectorization failed';
    return jsonResponse(request, { error: message }, 500);
  }
}
