/**
 * Procedural flat icon for first-run onboarding.
 * Few solid colors so ImageTracer produces a clean, readable SVG quickly.
 */
export function createSampleIconImageData(): ImageData {
  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create sample image');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Outer mark — action blue
  ctx.fillStyle = '#2563eb';
  roundRect(ctx, 48, 48, 224, 224, 40);
  ctx.fill();

  // Inner panel — white
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 88, 88, 144, 144, 24);
  ctx.fill();

  // Accent bar — green (download accent, used sparingly in product)
  ctx.fillStyle = '#16a34a';
  roundRect(ctx, 112, 200, 96, 20, 6);
  ctx.fill();

  // Small craft diamond
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.moveTo(160, 112);
  ctx.lineTo(188, 148);
  ctx.lineTo(160, 184);
  ctx.lineTo(132, 148);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
