import { describe, expect, it } from 'vitest';
import { VECTORIZE_DEFAULTS } from '../types/svg.types';
import { decodeVectorizePayload, encodeVectorizePayload } from './vectorizePayload';

describe('vectorize payload', () => {
  it('round-trips full-resolution RGBA pixels and settings', () => {
    const pixels = new Uint8ClampedArray([
      255, 246, 214, 255,
      18, 18, 20, 255,
    ]);
    const encoded = encodeVectorizePayload(
      { width: 2, height: 1, data: pixels },
      VECTORIZE_DEFAULTS
    );
    const decoded = decodeVectorizePayload(encoded);

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);
    expect(decoded.settings).toEqual(VECTORIZE_DEFAULTS);
    expect([...decoded.pixels]).toEqual([...pixels]);
  });

  it('rejects a payload whose declared dimensions do not match its pixels', () => {
    const encoded = encodeVectorizePayload(
      { width: 1, height: 1, data: new Uint8ClampedArray(4) },
      VECTORIZE_DEFAULTS
    );
    const truncated = encoded.subarray(0, encoded.length - 1);

    expect(() => decodeVectorizePayload(truncated)).toThrow(
      'Raw RGBA buffer size does not match dimensions'
    );
  });

  it('rejects images that exceed the service pixel limit before allocating the payload', () => {
    expect(() => encodeVectorizePayload(
      { width: 8_000, height: 4_000, data: new Uint8ClampedArray(4) },
      VECTORIZE_DEFAULTS
    )).toThrow('Vectorize image exceeds the supported pixel limit');
  });
});
