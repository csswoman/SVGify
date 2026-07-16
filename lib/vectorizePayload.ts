import type { VectorizeSettings } from '@/types/svg.types';

const MAGIC = new Uint8Array([0x53, 0x56, 0x47, 0x49, 0x46, 0x59, 0x30, 0x31]); // SVGIFY01
const HEADER_BYTES = MAGIC.length + 12;
/** Caps an RGBA request at roughly 64 MB before gzip. */
export const MAX_VECTORIZE_PIXELS = 16_000_000;
export const MAX_VECTORIZE_DIMENSION = 8_192;

export const VECTORIZE_PAYLOAD_CONTENT_TYPE = 'application/vnd.svgify.rgba+gzip';

export interface DecodedVectorizePayload {
  width: number;
  height: number;
  settings: VectorizeSettings;
  pixels: Uint8Array;
}

function assertDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1 || value > MAX_VECTORIZE_DIMENSION) {
    throw new Error(`Invalid vectorize ${name}`);
  }
}

function assertPixelCount(width: number, height: number): void {
  if (width * height > MAX_VECTORIZE_PIXELS) {
    throw new Error('Vectorize image exceeds the supported pixel limit');
  }
}

export function encodeVectorizePayload(
  imageData: Pick<ImageData, 'width' | 'height' | 'data'>,
  settings: VectorizeSettings
): Uint8Array {
  assertDimension(imageData.width, 'width');
  assertDimension(imageData.height, 'height');
  assertPixelCount(imageData.width, imageData.height);

  const expectedPixelBytes = imageData.width * imageData.height * 4;
  if (imageData.data.byteLength !== expectedPixelBytes) {
    throw new Error('Raw RGBA buffer size does not match dimensions');
  }

  const settingsBytes = new TextEncoder().encode(JSON.stringify(settings));
  const payload = new Uint8Array(HEADER_BYTES + settingsBytes.byteLength + expectedPixelBytes);
  payload.set(MAGIC, 0);

  const header = new DataView(payload.buffer, payload.byteOffset, HEADER_BYTES);
  header.setUint32(MAGIC.length, imageData.width, true);
  header.setUint32(MAGIC.length + 4, imageData.height, true);
  header.setUint32(MAGIC.length + 8, settingsBytes.byteLength, true);

  payload.set(settingsBytes, HEADER_BYTES);
  payload.set(imageData.data, HEADER_BYTES + settingsBytes.byteLength);
  return payload;
}

export function decodeVectorizePayload(payload: Uint8Array): DecodedVectorizePayload {
  if (payload.byteLength < HEADER_BYTES) {
    throw new Error('Vectorize payload is truncated');
  }

  for (let index = 0; index < MAGIC.length; index++) {
    if (payload[index] !== MAGIC[index]) {
      throw new Error('Unsupported vectorize payload');
    }
  }

  const header = new DataView(payload.buffer, payload.byteOffset, HEADER_BYTES);
  const width = header.getUint32(MAGIC.length, true);
  const height = header.getUint32(MAGIC.length + 4, true);
  const settingsLength = header.getUint32(MAGIC.length + 8, true);
  assertDimension(width, 'width');
  assertDimension(height, 'height');
  assertPixelCount(width, height);

  const pixelOffset = HEADER_BYTES + settingsLength;
  const expectedPixelBytes = width * height * 4;
  if (pixelOffset > payload.byteLength || payload.byteLength - pixelOffset !== expectedPixelBytes) {
    throw new Error('Raw RGBA buffer size does not match dimensions');
  }

  let settings: VectorizeSettings;
  try {
    settings = JSON.parse(new TextDecoder().decode(payload.subarray(HEADER_BYTES, pixelOffset))) as VectorizeSettings;
  } catch {
    throw new Error('Invalid vectorize settings');
  }

  return {
    width,
    height,
    settings,
    pixels: payload.subarray(pixelOffset),
  };
}
