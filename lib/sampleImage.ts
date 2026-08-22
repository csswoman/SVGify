/**
 * Sample icon for first-run onboarding, loaded from the bundled brand asset
 * so users vectorize something recognizable on their very first run.
 */
export async function createSampleIconImageData(): Promise<ImageData> {
  const image = await loadImage('/craftie-icon.png');

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create sample image');
  }

  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load sample image: ${src}`));
    image.src = src;
  });
}
