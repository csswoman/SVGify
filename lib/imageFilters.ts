/** Box blur on RGB; alpha is averaged separately (used for silhouette smoothing). */
export function applyBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  const r = Math.round(radius);
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const dst = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      let colorWeight = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.min(Math.max(x + dx, 0), width - 1);
        const idx = (y * width + nx) * 4;
        const alphaWeight = src[idx + 3] / 255;
        if (alphaWeight > 0) {
          rSum += src[idx] * alphaWeight;
          gSum += src[idx + 1] * alphaWeight;
          bSum += src[idx + 2] * alphaWeight;
          colorWeight += alphaWeight;
        }
        aSum += src[idx + 3];
        count++;
      }
      const oi = (y * width + x) * 4;
      dst[oi] = colorWeight > 0 ? rSum / colorWeight : src[oi];
      dst[oi + 1] = colorWeight > 0 ? gSum / colorWeight : src[oi + 1];
      dst[oi + 2] = colorWeight > 0 ? bSum / colorWeight : src[oi + 2];
      dst[oi + 3] = aSum / count;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      let colorWeight = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(Math.max(y + dy, 0), height - 1);
        const idx = (ny * width + x) * 4;
        const alphaWeight = dst[idx + 3] / 255;
        if (alphaWeight > 0) {
          rSum += dst[idx] * alphaWeight;
          gSum += dst[idx + 1] * alphaWeight;
          bSum += dst[idx + 2] * alphaWeight;
          colorWeight += alphaWeight;
        }
        aSum += dst[idx + 3];
        count++;
      }
      const oi = (y * width + x) * 4;
      src[oi] = colorWeight > 0 ? rSum / colorWeight : dst[oi];
      src[oi + 1] = colorWeight > 0 ? gSum / colorWeight : dst[oi + 1];
      src[oi + 2] = colorWeight > 0 ? bSum / colorWeight : dst[oi + 2];
      src[oi + 3] = aSum / count;
    }
  }

  return new ImageData(src, width, height);
}

function morphAlpha(imageData: ImageData, radius: number, mode: 'dilate' | 'erode'): ImageData {
  if (radius <= 0) return imageData;

  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oi = (y * width + x) * 4;
      let alpha = mode === 'dilate' ? 0 : 255;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(Math.max(x + dx, 0), width - 1);
          const ny = Math.min(Math.max(y + dy, 0), height - 1);
          const sample = data[(ny * width + nx) * 4 + 3];
          alpha = mode === 'dilate' ? Math.max(alpha, sample) : Math.min(alpha, sample);
        }
      }

      out[oi] = data[oi];
      out[oi + 1] = data[oi + 1];
      out[oi + 2] = data[oi + 2];
      out[oi + 3] = alpha;
    }
  }

  return new ImageData(out, width, height);
}

export function morphOpenAlpha(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  return morphAlpha(morphAlpha(imageData, radius, 'erode'), radius, 'dilate');
}

export function morphErodeAlpha(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  return morphAlpha(imageData, radius, 'erode');
}

export function morphCloseAlpha(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  return morphAlpha(morphAlpha(imageData, radius, 'dilate'), radius, 'erode');
}

/** Blur + close + binarize alpha for a cleaner outer silhouette. */
export function buildIconSilhouette(imageData: ImageData, blurRadius: number): ImageData {
  // Expand semi-transparent pixels first so drop shadows survive edge blur.
  const expanded = morphCloseAlpha(imageData, 1);
  const blurred = blurRadius > 0 ? applyBlur(expanded, blurRadius) : expanded;
  const morphRadius = blurRadius > 0 ? Math.min(2, Math.ceil(blurRadius / 2)) : 1;
  const closed = morphCloseAlpha(blurred, morphRadius);
  const out = new ImageData(new Uint8ClampedArray(closed.data), closed.width, closed.height);

  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i + 3] = out.data[i + 3] >= 40 ? 255 : 0;
  }

  return out;
}
