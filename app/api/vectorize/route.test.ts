import { gzipSync } from 'node:zlib';
import { PathSimplifyMode } from '@neplex/vectorizer';
import { describe, expect, it } from 'vitest';
import { encodeVectorizePayload, VECTORIZE_PAYLOAD_CONTENT_TYPE } from '@/lib/vectorizePayload';
import { VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { POST, toVTracerConfig } from './route';

describe('POST /api/vectorize', () => {
  it('keeps icon mode on polygon tracing even after opaque matte removal', () => {
    expect(toVTracerConfig({
      ...VECTORIZE_DEFAULTS,
      traceMode: 'icon',
      matteReconstructed: true,
    }).mode).toBe(PathSimplifyMode.Polygon);

    expect(toVTracerConfig({
      ...VECTORIZE_DEFAULTS,
      traceMode: 'standard',
    }).mode).toBe(PathSimplifyMode.Spline);
  });

  it('traces the packed RGBA transport used by the worker', async () => {
    const payload = encodeVectorizePayload(
      {
        width: 2,
        height: 2,
        data: new Uint8ClampedArray([
          255, 255, 255, 255, 0, 0, 0, 255,
          0, 0, 0, 255, 255, 255, 255, 255,
        ]),
      },
      { ...VECTORIZE_DEFAULTS, traceMode: 'icon', colorPrecision: 2, numberofcolors: 4 }
    );
    const request = new Request('http://localhost/api/vectorize', {
      method: 'POST',
      headers: { 'content-type': VECTORIZE_PAYLOAD_CONTENT_TYPE },
      body: gzipSync(payload),
    });

    const response = await POST(request);
    const body = await response.json() as { svg?: string };

    expect(response.status).toBe(200);
    expect(body.svg).toContain('<svg');
  });

  it('returns a recoverable error for malformed packed input', async () => {
    const request = new Request('http://localhost/api/vectorize', {
      method: 'POST',
      headers: { 'content-type': VECTORIZE_PAYLOAD_CONTENT_TYPE },
      body: gzipSync(new Uint8Array([1, 2, 3])),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
