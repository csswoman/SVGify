export interface FileValidationError {
  code: 'INVALID_MIME' | 'INVALID_MAGIC' | 'FILE_TOO_LARGE' | 'INVALID_DIMENSIONS';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: FileValidationError;
}

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSIONS = 16384; // 16k x 16k max

export async function validateFile(file: File): Promise<ValidationResult> {
  // Check MIME type
  if (!ALLOWED_MIMES.includes(file.type)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MIME',
        message: `Invalid file type. Allowed: PNG, JPG, WEBP. Got: ${file.type}`,
      },
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 10 MB.`,
      },
    };
  }

  // Check magic bytes
  const header = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(header);

  let isMagicValid = false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    isMagicValid = true; // PNG
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    isMagicValid = true; // JPG
  } else if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    isMagicValid = true; // WEBP
  }

  if (!isMagicValid) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MAGIC',
        message: 'File magic bytes do not match PNG/JPG/WEBP format.',
      },
    };
  }

  return { ok: true };
}

export async function fileToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Check dimensions
        if (img.width > MAX_DIMENSIONS || img.height > MAX_DIMENSIONS) {
          reject(
            new Error(
              `Image dimensions too large (${img.width}x${img.height}). Max: ${MAX_DIMENSIONS}x${MAX_DIMENSIONS}.`
            )
          );
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
