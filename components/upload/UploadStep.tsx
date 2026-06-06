'use client';

import { useState } from 'react';
import { ImageDropzone } from './ImageDropzone';

interface UploadStepProps {
  onUploadComplete: (imageData: ImageData) => void;
}

export function UploadStep({ onUploadComplete }: UploadStepProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Upload Image</h1>
        <p className="text-gray-500">Convert a raster image to a scalable SVG vector.</p>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <ImageDropzone
        onImageData={(imageData) => {
          setError(null);
          onUploadComplete(imageData);
        }}
        onError={setError}
      />

      <p className="text-xs text-center text-gray-400">
        Your image never leaves your device. All processing is 100% client-side.
      </p>
    </div>
  );
}
