# SVGcraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, client-side SVG vectorizer web app with color editing and path labeling, using imagetracerjs for pure-JS vectorization.

**Architecture:** Four-step wizard (Upload → Vectorize → Colors → Labels), with a Web Worker running imagetracerjs to keep the UI responsive. All vectorization happens client-side; SVGs are sanitized before rendering. Labels are stored as `data-label` + `<title>` attributes and survive export/re-import.

**Tech Stack:** Next.js 16.2.7 (App Router, `output: 'export'`), React 19, Tailwind v4, imagetracerjs@1.2.6 (pure JS), Web Worker.

---

## File Structure

### Core Types & Utilities (no UI)
- `types/svg.types.ts` — all TS types (strict, no `any`)
- `lib/sanitize.ts` — SVG sanitization (strip `<script>`, `on*`, external refs)
- `lib/svgParser.ts` — parse SVG string → DOM, extract paths/colors (no innerHTML)
- `lib/colorUtils.ts` — hex/rgb validation, conversion, extraction from SVG
- `lib/fileUtils.ts` — validate MIME + magic bytes, read file → ImageData
- `lib/labelUtils.ts` — sanitize label text, write `data-label` + `<title>`

### Hooks (logic layer, no UI)
- `hooks/useVectorizer.ts` — manages worker, vectorization state, progress
- `hooks/useSvgColors.ts` — extract/replace fills from DOM
- `hooks/usePathLabels.ts` — add/remove/list labeled paths
- `hooks/useSvgSelection.ts` — track currently selected path

### Worker
- `workers/vectorizer.worker.ts` — imports imagetracerjs, handles message API

### Components (UI, max 200 lines each)
- `components/upload/ImageDropzone.tsx` — drag & drop UI
- `components/upload/UploadStep.tsx` — orchestrates upload (validation, ImageData)
- `components/vectorize/VectorizeSettings.tsx` — settings panel + presets
- `components/vectorize/SvgPreview.tsx` — interactive SVG canvas (clickable paths)
- `components/vectorize/VectorizeStep.tsx` — orchestrates vectorization
- `components/colors/ColorSwatches.tsx` — list of extracted fills
- `components/colors/ColorPicker.tsx` — HTML `<input type="color">`
- `components/colors/ColorEditStep.tsx` — orchestrates color editing
- `components/labels/LabelSidebar.tsx` — list of labels, click to highlight
- `components/labels/LabelInput.tsx` — text input for labeling a path
- `components/labels/LabelStep.tsx` — orchestrates labeling
- `components/shared/StepIndicator.tsx` — progress dots, navigation
- `components/shared/ErrorBoundary.tsx` — catch and display errors safely
- `components/shared/LoadingState.tsx` — spinner + status text
- `components/shared/DownloadButton.tsx` — download SVG with label legend comment

### App & Layout
- `app/layout.tsx` — root layout (CSP meta tag, font, tailwind)
- `app/page.tsx` — page component (top-level state, step navigation)
- `app/globals.css` — tailwind directives + custom styles

### Configuration & CI
- `next.config.ts` — output: 'export', no API routes
- `.github/workflows/ci.yml` — lint, typecheck, build
- `.eslintrc.json` — Next.js defaults
- `tsconfig.json` — strict mode, no `any`

---

## Task Breakdown

### Task 1: Types & Lib — SVG Types

**Files:**
- Create: `types/svg.types.ts`

- [ ] **Step 1: Define SVG types**

```typescript
// All strict, no `any`

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface SVGPath {
  id: string;
  d: string;
  fill: RGBColor;
  stroke?: RGBColor;
  opacity?: number;
  label?: string;
}

export interface SVGDocument {
  svg: SVGElement;
  paths: SVGPath[];
  width: number;
  height: number;
}

export interface VectorizeSettings {
  numberofcolors: number; // 2-256
  ltres: number;          // 0.1-5
  qtres: number;          // 0.1-5
  colorsampling: number;  // 0-n
  strokewidth: number;    // 1-5
  scale: number;
}

export interface VectorizePreset {
  name: 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}

export const VECTORIZE_PRESETS: Record<VectorizePreset['name'], VectorizeSettings> = {
  logo: {
    numberofcolors: 4,
    ltres: 2,
    qtres: 1,
    colorsampling: 2,
    strokewidth: 1,
    scale: 1,
  },
  sketch: {
    numberofcolors: 2,
    ltres: 0.5,
    qtres: 0.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
  },
  photo: {
    numberofcolors: 16,
    ltres: 0.5,
    qtres: 0.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
  },
};

export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  numberofcolors: 8,
  ltres: 1,
  qtres: 1,
  colorsampling: 2,
  strokewidth: 1,
  scale: 1,
};

export interface WorkerMessage {
  type: 'vectorize' | 'cancel';
  imageData?: ImageData;
  settings?: VectorizeSettings;
}

export interface WorkerResponse {
  type: 'ready' | 'progress' | 'done' | 'error';
  value?: number;        // progress: 0..1
  svg?: string;          // done
  message?: string;      // error
}
```

- [ ] **Step 2: Commit**

```bash
git add types/svg.types.ts
git commit -m "types: core SVG and vectorization types"
```

---

### Task 2: Lib — File Validation Utilities

**Files:**
- Create: `lib/fileUtils.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// lib/fileUtils.ts
import { MIME_TYPES, MAGIC_BYTES } from '@/lib/constants';

export interface FileValidationError {
  code: 'INVALID_MIME' | 'INVALID_MAGIC' | 'FILE_TOO_LARGE' | 'INVALID_DIMENSIONS';
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: FileValidationError;
}

// MIME types and magic bytes for PNG, JPG, WEBP
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

const MAGIC_BYTES_MAP: Record<string, Uint8Array> = {
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  jpg: new Uint8Array([0xff, 0xd8, 0xff]),
  webp: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSIONS = 16384; // 16k x 16k max
```

- [ ] **Step 2: Implement validation function**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/fileUtils.ts
git commit -m "lib: file validation and ImageData conversion"
```

---

### Task 3: Lib — Color Utilities

**Files:**
- Create: `lib/colorUtils.ts`

- [ ] **Step 1: Implement color validation and conversion**

```typescript
// lib/colorUtils.ts
import { RGBColor } from '@/types/svg.types';

export function hexToRgb(hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function rgbToString(color: RGBColor): string {
  return `rgb(${color.r},${color.g},${color.b})`;
}

export function parseRgbString(str: string): RGBColor | null {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(str);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

export function isValidRgb(rgb: RGBColor): boolean {
  return (
    rgb.r >= 0 && rgb.r <= 255 &&
    rgb.g >= 0 && rgb.g <= 255 &&
    rgb.b >= 0 && rgb.b <= 255
  );
}

// Extract unique colors from SVG DOM
export function extractColorsFromSvg(svg: SVGElement): RGBColor[] {
  const colors: RGBColor[] = [];
  const seen = new Set<string>();

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    if (fill) {
      const color = parseRgbString(fill);
      if (color) {
        const hex = rgbToHex(color);
        if (!seen.has(hex)) {
          seen.add(hex);
          colors.push(color);
        }
      }
    }
  });

  return colors;
}

// Replace all paths with a specific fill color
export function replaceColorInSvg(svg: SVGElement, oldColor: RGBColor, newColor: RGBColor): void {
  const oldStr = rgbToString(oldColor);
  const newStr = rgbToString(newColor);

  const paths = svg.querySelectorAll('path');
  paths.forEach((path) => {
    const fill = path.getAttribute('fill');
    if (fill === oldStr) {
      path.setAttribute('fill', newStr);
      path.setAttribute('stroke', newStr);
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/colorUtils.ts
git commit -m "lib: color validation and conversion utilities"
```

---

### Task 4: Lib — SVG Parser

**Files:**
- Create: `lib/svgParser.ts`

- [ ] **Step 1: Implement SVG parsing and sanitization setup**

```typescript
// lib/svgParser.ts
import { SVGDocument, SVGPath, RGBColor } from '@/types/svg.types';
import { parseRgbString } from '@/lib/colorUtils';
import { sanitizeSvgString } from '@/lib/sanitize';

export function parseSvgString(svgString: string): SVGDocument | null {
  try {
    // Sanitize first
    const sanitized = sanitizeSvgString(svgString);

    // Parse with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');

    // Check for parsing errors
    if (doc.documentElement.tagName === 'parsererror') {
      throw new Error('SVG parsing failed');
    }

    const svg = doc.documentElement as SVGElement;
    const paths = extractPathsFromSvg(svg);

    // Get dimensions
    const width = parseFloat(svg.getAttribute('width') || svg.getAttribute('viewBox')?.split(' ')[2] || '100');
    const height = parseFloat(svg.getAttribute('height') || svg.getAttribute('viewBox')?.split(' ')[3] || '100');

    return {
      svg,
      paths,
      width,
      height,
    };
  } catch (err) {
    console.error('Failed to parse SVG:', err);
    return null;
  }
}

export function extractPathsFromSvg(svg: SVGElement): SVGPath[] {
  const paths: SVGPath[] = [];
  let pathId = 0;

  svg.querySelectorAll('path').forEach((pathEl) => {
    const d = pathEl.getAttribute('d');
    if (!d) return;

    const fill = pathEl.getAttribute('fill') || '#000000';
    const stroke = pathEl.getAttribute('stroke');
    const opacity = parseFloat(pathEl.getAttribute('opacity') || '1');
    const label = pathEl.getAttribute('data-label');

    // Parse fill color
    let fillColor: RGBColor = { r: 0, g: 0, b: 0 };
    const parsed = parseRgbString(fill);
    if (parsed) {
      fillColor = parsed;
    } else if (fill.startsWith('#')) {
      // Try hex
      const hexMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fill);
      if (hexMatch) {
        fillColor = {
          r: parseInt(hexMatch[1], 16),
          g: parseInt(hexMatch[2], 16),
          b: parseInt(hexMatch[3], 16),
        };
      }
    }

    const strokeColor = stroke ? parseRgbString(stroke) : undefined;

    paths.push({
      id: `path-${pathId++}`,
      d,
      fill: fillColor,
      stroke: strokeColor,
      opacity,
      label,
    });
  });

  return paths;
}

export function svgElementToString(svg: SVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/svgParser.ts
git commit -m "lib: SVG parsing and path extraction"
```

---

### Task 5: Lib — Sanitization

**Files:**
- Create: `lib/sanitize.ts`

- [ ] **Step 1: Implement SVG sanitization**

```typescript
// lib/sanitize.ts

export function sanitizeSvgString(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  if (doc.documentElement.tagName === 'parsererror') {
    throw new Error('Invalid SVG');
  }

  const svg = doc.documentElement;

  // Remove dangerous elements
  const dangerousElements = svg.querySelectorAll('script, foreignObject, style, iframe, object, embed, link, meta, title, base');
  dangerousElements.forEach((el) => el.remove());

  // Remove event handlers and javascript: URLs
  const allElements = svg.querySelectorAll('*');
  allElements.forEach((el) => {
    // Remove on* attributes
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }

      // Remove javascript: URLs in href/xlink:href
      if ((attr.name === 'href' || attr.name === 'xlink:href') && attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }

      // Remove data: URLs that could be malicious (except data:image)
      if (attr.name === 'href' || attr.name === 'xlink:href') {
        if (attr.value.startsWith('data:') && !attr.value.startsWith('data:image/')) {
          el.removeAttribute(attr.name);
        }
      }
    });

    // Handle <use> elements pointing off-document
    if (el.tagName.toLowerCase() === 'use') {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href');
      if (href && href.startsWith('http://')) {
        el.remove();
      }
    }
  });

  return new XMLSerializer().serializeToString(svg);
}

// Validate color input
export function sanitizeColorInput(color: string): string | null {
  // Only allow hex colors
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return null;
  }
  return color;
}

// Sanitize label text (for data-label attribute)
export function sanitizeLabelText(label: string): string {
  // Remove dangerous characters and limit length
  return label.replace(/[<>"&]/g, '').slice(0, 100);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sanitize.ts
git commit -m "lib: SVG sanitization and input validation"
```

---

### Task 6: Lib — Label Utilities

**Files:**
- Create: `lib/labelUtils.ts`

- [ ] **Step 1: Implement label operations**

```typescript
// lib/labelUtils.ts
import { sanitizeLabelText } from '@/lib/sanitize';

export interface LabelInfo {
  pathId: string;
  label: string;
}

export function addLabelToPath(pathEl: SVGPathElement, label: string): void {
  const sanitized = sanitizeLabelText(label);
  if (!sanitized) return;

  pathEl.setAttribute('data-label', sanitized);

  // Create or update <title> element
  let titleEl = pathEl.querySelector('title');
  if (!titleEl) {
    titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    pathEl.insertBefore(titleEl, pathEl.firstChild);
  }
  titleEl.textContent = sanitized;
}

export function removeLabelFromPath(pathEl: SVGPathElement): void {
  pathEl.removeAttribute('data-label');
  const titleEl = pathEl.querySelector('title');
  if (titleEl) {
    titleEl.remove();
  }
}

export function getLabelFromPath(pathEl: SVGPathElement): string | null {
  return pathEl.getAttribute('data-label');
}

export function extractLabelsFromSvg(svg: SVGElement): LabelInfo[] {
  const labels: LabelInfo[] = [];
  let pathId = 0;

  svg.querySelectorAll('path').forEach((pathEl) => {
    const label = pathEl.getAttribute('data-label');
    if (label) {
      labels.push({
        pathId: `path-${pathId}`,
        label,
      });
    }
    pathId++;
  });

  return labels;
}

export function generateLabelLegendComment(labels: LabelInfo[]): string {
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.label)));
  return `<!-- SVGcraft labels: ${uniqueLabels.join(', ')} -->`;
}

export function prependLabelLegend(svgString: string, labels: LabelInfo[]): string {
  if (labels.length === 0) return svgString;

  const legend = generateLabelLegendComment(labels);
  return legend + '\n' + svgString;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/labelUtils.ts
git commit -m "lib: path labeling utilities"
```

---

### Task 7: Worker — Vectorizer Worker

**Files:**
- Create: `workers/vectorizer.worker.ts`

- [ ] **Step 1: Import imagetracerjs and define worker message types**

```typescript
// workers/vectorizer.worker.ts
import ImageTracer from 'imagetracerjs';
import { WorkerMessage, WorkerResponse, VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';

// Notify main thread that worker is ready
self.postMessage({ type: 'ready' } satisfies WorkerResponse);

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, settings } = event.data;

  if (type === 'vectorize' && imageData && settings) {
    try {
      vectorizeImage(imageData, settings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      self.postMessage({ type: 'error', message } satisfies WorkerResponse);
    }
  }
};

function vectorizeImage(imageData: ImageData, settings: VectorizeSettings): void {
  try {
    // Merge with defaults
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    // Call imagetracerjs
    const svgString = ImageTracer.imagedataToSVG(imageData, {
      numberofcolors: options.numberofcolors,
      ltres: options.ltres,
      qtres: options.qtres,
      colorsampling: options.colorsampling,
      strokewidth: options.strokewidth,
      scale: options.scale,
    });

    // Send result back
    self.postMessage({ type: 'done', svg: svgString } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/vectorizer.worker.ts
git commit -m "worker: imagetracerjs vectorizer in Web Worker"
```

---

### Task 8: Hook — useVectorizer

**Files:**
- Create: `hooks/useVectorizer.ts`

- [ ] **Step 1: Implement vectorizer hook**

```typescript
// hooks/useVectorizer.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { VectorizeSettings, WorkerResponse } from '@/types/svg.types';

export interface VectorizerState {
  svg: string | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export function useVectorizer() {
  const [state, setState] = useState<VectorizerState>({
    svg: null,
    isLoading: false,
    progress: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initialize worker once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('@/workers/vectorizer.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, svg, message, value } = event.data;

      if (type === 'done' && svg) {
        setState({ svg, isLoading: false, progress: 1, error: null });
      } else if (type === 'error' && message) {
        setState({ svg: null, isLoading: false, progress: 0, error: message });
      } else if (type === 'progress' && value !== undefined) {
        setState((prev) => ({ ...prev, progress: value }));
      }
    };

    worker.onerror = (err) => {
      setState({
        svg: null,
        isLoading: false,
        progress: 0,
        error: `Worker error: ${err.message}`,
      });
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const vectorize = useCallback(
    async (imageData: ImageData, settings: VectorizeSettings) => {
      if (!workerRef.current) {
        setState({
          svg: null,
          isLoading: false,
          progress: 0,
          error: 'Worker not initialized',
        });
        return;
      }

      setState({ svg: null, isLoading: true, progress: 0, error: null });
      abortRef.current = new AbortController();

      workerRef.current.postMessage({
        type: 'vectorize',
        imageData,
        settings,
      });
    },
    []
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    ...state,
    vectorize,
    cancel,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useVectorizer.ts
git commit -m "hook: useVectorizer manages worker and vectorization state"
```

---

### Task 9: Hook — useSvgColors

**Files:**
- Create: `hooks/useSvgColors.ts`

- [ ] **Step 1: Implement color extraction and replacement hook**

```typescript
// hooks/useSvgColors.ts
import { useCallback, useState } from 'react';
import { RGBColor } from '@/types/svg.types';
import { extractColorsFromSvg, replaceColorInSvg, rgbToHex } from '@/lib/colorUtils';

export function useSvgColors(svgElement: SVGElement | null) {
  const [colors, setColors] = useState<RGBColor[]>([]);

  // Extract unique colors from SVG
  const extractColors = useCallback(() => {
    if (!svgElement) return;
    const extracted = extractColorsFromSvg(svgElement);
    setColors(extracted);
  }, [svgElement]);

  // Replace a color globally
  const replaceColor = useCallback(
    (oldColor: RGBColor, newColor: RGBColor) => {
      if (!svgElement) return;
      replaceColorInSvg(svgElement, oldColor, newColor);
      // Update colors list (newColor replaces oldColor)
      setColors((prev) =>
        prev.map((c) =>
          rgbToHex(c) === rgbToHex(oldColor) ? newColor : c
        )
      );
    },
    [svgElement]
  );

  // Replace color of a specific path
  const replacePathColor = useCallback(
    (pathEl: SVGPathElement, newColor: RGBColor) => {
      const rgbStr = `rgb(${newColor.r},${newColor.g},${newColor.b})`;
      pathEl.setAttribute('fill', rgbStr);
      pathEl.setAttribute('stroke', rgbStr);
    },
    []
  );

  return {
    colors,
    extractColors,
    replaceColor,
    replacePathColor,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useSvgColors.ts
git commit -m "hook: useSvgColors extracts and replaces SVG colors"
```

---

### Task 10: Hook — usePathLabels

**Files:**
- Create: `hooks/usePathLabels.ts`

- [ ] **Step 1: Implement label management hook**

```typescript
// hooks/usePathLabels.ts
import { useCallback, useState } from 'react';
import { LabelInfo, addLabelToPath, removeLabelFromPath, extractLabelsFromSvg } from '@/lib/labelUtils';

export function usePathLabels(svgElement: SVGElement | null) {
  const [labels, setLabels] = useState<LabelInfo[]>([]);

  // Extract existing labels from SVG
  const extractLabels = useCallback(() => {
    if (!svgElement) return;
    const extracted = extractLabelsFromSvg(svgElement);
    setLabels(extracted);
  }, [svgElement]);

  // Add label to a path element
  const addLabel = useCallback(
    (pathEl: SVGPathElement, label: string) => {
      addLabelToPath(pathEl, label);
      extractLabels();
    },
    [extractLabels]
  );

  // Remove label from a path element
  const removeLabel = useCallback(
    (pathEl: SVGPathElement) => {
      removeLabelFromPath(pathEl);
      extractLabels();
    },
    [extractLabels]
  );

  // Get label for a specific path
  const getLabelForPath = useCallback(
    (pathEl: SVGPathElement): string | null => {
      return pathEl.getAttribute('data-label');
    },
    []
  );

  // Find path element by label
  const getPathByLabel = useCallback(
    (label: string): SVGPathElement | null => {
      if (!svgElement) return null;
      return svgElement.querySelector(`path[data-label="${label}"]`);
    },
    [svgElement]
  );

  return {
    labels,
    extractLabels,
    addLabel,
    removeLabel,
    getLabelForPath,
    getPathByLabel,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/usePathLabels.ts
git commit -m "hook: usePathLabels manages path labels"
```

---

### Task 11: Hook — useSvgSelection

**Files:**
- Create: `hooks/useSvgSelection.ts`

- [ ] **Step 1: Implement path selection hook**

```typescript
// hooks/useSvgSelection.ts
import { useCallback, useState } from 'react';

export function useSvgSelection() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedPathEl, setSelectedPathEl] = useState<SVGPathElement | null>(null);

  const selectPath = useCallback((pathEl: SVGPathElement, id: string) => {
    // Clear previous selection
    if (selectedPathEl) {
      selectedPathEl.style.stroke = selectedPathEl.getAttribute('stroke') || 'currentColor';
      selectedPathEl.style.strokeWidth = selectedPathEl.getAttribute('stroke-width') || '1';
    }

    // Highlight new selection
    pathEl.style.stroke = '#ff0000';
    pathEl.style.strokeWidth = '3';

    setSelectedPathEl(pathEl);
    setSelectedPathId(id);
  }, [selectedPathEl]);

  const clearSelection = useCallback(() => {
    if (selectedPathEl) {
      selectedPathEl.style.stroke = selectedPathEl.getAttribute('stroke') || 'currentColor';
      selectedPathEl.style.strokeWidth = selectedPathEl.getAttribute('stroke-width') || '1';
    }
    setSelectedPathEl(null);
    setSelectedPathId(null);
  }, [selectedPathEl]);

  return {
    selectedPathId,
    selectedPathEl,
    selectPath,
    clearSelection,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useSvgSelection.ts
git commit -m "hook: useSvgSelection tracks and highlights selected paths"
```

---

### Task 12: Components — Shared Chrome

**Files:**
- Create: `components/shared/StepIndicator.tsx`
- Create: `components/shared/ErrorBoundary.tsx`
- Create: `components/shared/LoadingState.tsx`
- Create: `components/shared/DownloadButton.tsx`

- [ ] **Step 1: StepIndicator**

```typescript
// components/shared/StepIndicator.tsx
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

const STEP_NAMES = ['Upload', 'Vectorize', 'Colors', 'Labels'];

export function StepIndicator({ currentStep, totalSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <button
            onClick={() => onStepClick?.(i)}
            disabled={i > currentStep}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
              i === currentStep
                ? 'bg-blue-600 text-white'
                : i < currentStep
                ? 'bg-green-600 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {i + 1}
          </button>
          {i < totalSteps - 1 && (
            <div className={`w-12 h-1 mx-2 ${i < currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
      <div className="ml-4 text-sm font-medium text-gray-700">
        {STEP_NAMES[currentStep] || 'Unknown'}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ErrorBoundary**

```typescript
// components/shared/ErrorBoundary.tsx
import { ReactNode, Component, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-100 border border-red-400 rounded-lg">
          <h2 className="text-lg font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-700 text-sm">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 3: LoadingState**

```typescript
// components/shared/LoadingState.tsx
interface LoadingStateProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function LoadingState({ isLoading, progress, message }: LoadingStateProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {message || 'Processing...'}
          </p>
          {progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: DownloadButton**

```typescript
// components/shared/DownloadButton.tsx
import { prependLabelLegend } from '@/lib/labelUtils';
import { LabelInfo } from '@/lib/labelUtils';

interface DownloadButtonProps {
  svgString: string | null;
  labels?: LabelInfo[];
  fileName?: string;
}

export function DownloadButton({ svgString, labels = [], fileName = 'image.svg' }: DownloadButtonProps) {
  const handleDownload = () => {
    if (!svgString) return;

    // Add label legend comment if labels exist
    let content = svgString;
    if (labels.length > 0) {
      content = prependLabelLegend(svgString, labels);
    }

    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!svgString}
      className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
    >
      Download SVG
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/shared/
git commit -m "components: shared UI chrome (step indicator, error boundary, loading, download)"
```

---

### Task 13: Components — Upload

**Files:**
- Create: `components/upload/ImageDropzone.tsx`
- Create: `components/upload/UploadStep.tsx`

- [ ] **Step 1: ImageDropzone**

```typescript
// components/upload/ImageDropzone.tsx
'use client';

import { useCallback, useState } from 'react';
import { validateFile, fileToImageData } from '@/lib/fileUtils';

interface ImageDropzoneProps {
  onImageData: (imageData: ImageData) => void;
  onError: (error: string) => void;
}

export function ImageDropzone({ onImageData, onError }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const validation = await validateFile(file);
        if (!validation.ok && validation.error) {
          onError(validation.error.message);
          return;
        }

        const imageData = await fileToImageData(file);
        onImageData(imageData);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to load image');
      }
    },
    [onImageData, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <div
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-4 border-dashed rounded-lg p-12 text-center transition ${
        isDragging
          ? 'border-blue-600 bg-blue-100'
          : 'border-gray-400 bg-gray-50 hover:border-gray-600'
      }`}
    >
      <div className="mb-4 text-4xl">📁</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Drag & drop your image</h2>
      <p className="text-gray-600 mb-4">or</p>
      <label className="inline-block">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />
        <span className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer inline-block">
          Choose file
        </span>
      </label>
      <p className="text-sm text-gray-500 mt-4">PNG, JPG, or WEBP • Max 10 MB</p>
    </div>
  );
}
```

- [ ] **Step 2: UploadStep**

```typescript
// components/upload/UploadStep.tsx
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Image</h1>
        <p className="text-gray-600">Convert your raster image to a vector SVG</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
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
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/upload/
git commit -m "components: image upload with drag & drop and validation"
```

---

### Task 14: Components — Vectorize

**Files:**
- Create: `components/vectorize/VectorizeSettings.tsx`
- Create: `components/vectorize/SvgPreview.tsx`
- Create: `components/vectorize/VectorizeStep.tsx`

- [ ] **Step 1: VectorizeSettings**

```typescript
// components/vectorize/VectorizeSettings.tsx
'use client';

import { VectorizeSettings, VECTORIZE_PRESETS } from '@/types/svg.types';

interface VectorizeSettingsProps {
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeSettings({ settings, onSettingsChange }: VectorizeSettingsProps) {
  const applyPreset = (presetName: keyof typeof VECTORIZE_PRESETS) => {
    onSettingsChange({ ...settings, ...VECTORIZE_PRESETS[presetName] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Presets</h2>
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(VECTORIZE_PRESETS).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key as any)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition capitalize"
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Colors: {settings.numberofcolors}
          </label>
          <input
            type="range"
            min="2"
            max="256"
            value={settings.numberofcolors}
            onChange={(e) =>
              onSettingsChange({ ...settings, numberofcolors: parseInt(e.target.value) })
            }
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Fewer colors = simpler; more = detailed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Smoothing (ltres): {settings.ltres.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={settings.ltres}
            onChange={(e) => onSettingsChange({ ...settings, ltres: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detail (qtres): {settings.qtres.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={settings.qtres}
            onChange={(e) => onSettingsChange({ ...settings, qtres: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stroke width: {settings.strokewidth}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={settings.strokewidth}
            onChange={(e) =>
              onSettingsChange({ ...settings, strokewidth: parseInt(e.target.value) })
            }
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SvgPreview**

```typescript
// components/vectorize/SvgPreview.tsx
'use client';

import { useEffect, useRef } from 'react';
import { sanitizeSvgString } from '@/lib/sanitize';

interface SvgPreviewProps {
  svgString: string | null;
  onPathClick?: (pathEl: SVGPathElement) => void;
}

export function SvgPreview({ svgString, onPathClick }: SvgPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgString || !containerRef.current) return;

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') {
        throw new Error('Failed to parse SVG');
      }

      const svg = doc.documentElement as SVGElement;

      // Add click handlers to paths
      svg.querySelectorAll('path').forEach((path) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', () => onPathClick?.(path));
      });

      // Clear and mount
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(svg);
    } catch (err) {
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p class="text-red-600">Failed to render SVG: ${err instanceof Error ? err.message : 'Unknown error'}</p>`;
      }
    }
  }, [svgString, onPathClick]);

  return (
    <div
      ref={containerRef}
      className="border border-gray-300 rounded-lg bg-white p-4 min-h-96 flex items-center justify-center"
    >
      <p className="text-gray-400">SVG preview will appear here</p>
    </div>
  );
}
```

- [ ] **Step 3: VectorizeStep**

```typescript
// components/vectorize/VectorizeStep.tsx
'use client';

import { useState, useCallback } from 'react';
import { useVectorizer } from '@/hooks/useVectorizer';
import { VectorizeSettings, VECTORIZE_DEFAULTS } from '@/types/svg.types';
import { VectorizeSettings as VectorizeSettingsComponent } from './VectorizeSettings';
import { SvgPreview } from './SvgPreview';
import { LoadingState } from '@/components/shared/LoadingState';
import { DownloadButton } from '@/components/shared/DownloadButton';

interface VectorizeStepProps {
  imageData: ImageData;
  onVectorizeComplete: (svgString: string) => void;
}

export function VectorizeStep({ imageData, onVectorizeComplete }: VectorizeStepProps) {
  const [settings, setSettings] = useState<VectorizeSettings>(VECTORIZE_DEFAULTS);
  const { svg, isLoading, error, vectorize } = useVectorizer();

  const handleVectorize = useCallback(() => {
    vectorize(imageData, settings);
  }, [imageData, settings, vectorize]);

  const handleContinue = useCallback(() => {
    if (svg) {
      onVectorizeComplete(svg);
    }
  }, [svg, onVectorizeComplete]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vectorize</h1>
        <p className="text-gray-600">Adjust settings to control the output quality</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Preview</h2>
          <SvgPreview svgString={svg} />
        </div>

        <div className="space-y-6">
          <VectorizeSettingsComponent settings={settings} onSettingsChange={setSettings} />

          <button
            onClick={handleVectorize}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {isLoading ? 'Vectorizing...' : 'Vectorize'}
          </button>

          {svg && (
            <DownloadButton svgString={svg} fileName="vectorized.svg" />
          )}
        </div>
      </div>

      {svg && (
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Continue to Colors
          </button>
        </div>
      )}

      <LoadingState isLoading={isLoading} message="Vectorizing image..." />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/vectorize/
git commit -m "components: vectorization with settings, presets, and preview"
```

---

### Task 15: Components — Color Editor

**Files:**
- Create: `components/colors/ColorSwatches.tsx`
- Create: `components/colors/ColorPicker.tsx`
- Create: `components/colors/ColorEditStep.tsx`

- [ ] **Step 1: ColorSwatches**

```typescript
// components/colors/ColorSwatches.tsx
'use client';

import { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';

interface ColorSwatchesProps {
  colors: RGBColor[];
  onColorClick: (color: RGBColor) => void;
  selectedColor?: RGBColor;
}

export function ColorSwatches({ colors, onColorClick, selectedColor }: ColorSwatchesProps) {
  if (colors.length === 0) {
    return <p className="text-gray-500">No colors found in SVG</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Colors</h3>
      <div className="space-y-2">
        {colors.map((color, idx) => {
          const hex = rgbToHex(color);
          const isSelected = selectedColor && rgbToHex(selectedColor) === hex;

          return (
            <button
              key={idx}
              onClick={() => onColorClick(color)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${
                isSelected
                  ? 'bg-blue-100 border-2 border-blue-600'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: hex }}
              />
              <span className="font-mono text-sm text-gray-700">{hex}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ColorPicker**

```typescript
// components/colors/ColorPicker.tsx
'use client';

import { RGBColor } from '@/types/svg.types';
import { hexToRgb, rgbToHex, isValidHex } from '@/lib/colorUtils';
import { useState } from 'react';

interface ColorPickerProps {
  color: RGBColor;
  onChange: (color: RGBColor) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(rgbToHex(color));

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexValue(hex);

    if (isValidHex(hex)) {
      const rgb = hexToRgb(hex);
      if (rgb) {
        onChange(rgb);
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="block font-semibold text-gray-900">New Color</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => {
            const hex = e.target.value;
            setHexValue(hex);
            const rgb = hexToRgb(hex);
            if (rgb) onChange(rgb);
          }}
          className="w-12 h-12 rounded cursor-pointer"
        />
        <input
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          placeholder="#000000"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-600"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ColorEditStep**

```typescript
// components/colors/ColorEditStep.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { RGBColor } from '@/types/svg.types';
import { useSvgColors } from '@/hooks/useSvgColors';
import { sanitizeSvgString } from '@/lib/sanitize';
import { ColorSwatches } from './ColorSwatches';
import { ColorPicker } from './ColorPicker';

interface ColorEditStepProps {
  svgString: string;
  onColorsEdited: (svgString: string) => void;
}

export function ColorEditStep({ svgString, onColorsEdited }: ColorEditStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<RGBColor | null>(null);
  const { colors, extractColors, replaceColor, replacePathColor } = useSvgColors(svgEl);

  // Mount SVG and extract colors
  useEffect(() => {
    if (!svgString || !containerRef.current) return;

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') {
        throw new Error('Failed to parse SVG');
      }

      const svg = doc.documentElement as SVGElement;

      // Add click handlers
      svg.querySelectorAll('path').forEach((path) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', (e) => {
          e.stopPropagation();
          const fill = path.getAttribute('fill');
          if (fill) {
            const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(fill);
            if (match) {
              setSelectedColor({
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
              });
            }
          }
        });
      });

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(svg);

      setSvgEl(svg);
      extractColors();
    } catch (err) {
      console.error('Error mounting SVG:', err);
    }
  }, [svgString, extractColors]);

  const handleGlobalColorChange = (oldColor: RGBColor, newColor: RGBColor) => {
    replaceColor(oldColor, newColor);
  };

  const handleColorPickerChange = (newColor: RGBColor) => {
    if (selectedColor) {
      handleGlobalColorChange(selectedColor, newColor);
      setSelectedColor(newColor);
    }
  };

  const handleExportEdited = () => {
    if (svgEl) {
      const edited = new XMLSerializer().serializeToString(svgEl);
      onColorsEdited(edited);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Colors</h1>
        <p className="text-gray-600">Click a color swatch to recolor all paths with that color</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="border border-gray-300 rounded-lg bg-white p-4 min-h-96"
          />
        </div>

        <div className="space-y-6">
          <ColorSwatches
            colors={colors}
            onColorClick={setSelectedColor}
            selectedColor={selectedColor}
          />

          {selectedColor && (
            <ColorPicker color={selectedColor} onChange={handleColorPickerChange} />
          )}

          <button
            onClick={handleExportEdited}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Continue to Labels
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/colors/
git commit -m "components: color editor with swatches and picker"
```

---

### Task 16: Components — Path Labeler

**Files:**
- Create: `components/labels/LabelSidebar.tsx`
- Create: `components/labels/LabelInput.tsx`
- Create: `components/labels/LabelStep.tsx`

- [ ] **Step 1: LabelSidebar**

```typescript
// components/labels/LabelSidebar.tsx
'use client';

import { LabelInfo } from '@/lib/labelUtils';

interface LabelSidebarProps {
  labels: LabelInfo[];
  onLabelClick: (label: string) => void;
  selectedLabel?: string;
}

export function LabelSidebar({ labels, onLabelClick, selectedLabel }: LabelSidebarProps) {
  const uniqueLabels = Array.from(new Set(labels.map((l) => l.label)));

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Labels</h3>
      {uniqueLabels.length === 0 ? (
        <p className="text-gray-500 text-sm">No labels yet. Click a path and add one!</p>
      ) : (
        <div className="space-y-2">
          {uniqueLabels.map((label) => (
            <button
              key={label}
              onClick={() => onLabelClick(label)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                selectedLabel === label
                  ? 'bg-blue-100 border-2 border-blue-600 text-blue-900 font-medium'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: LabelInput**

```typescript
// components/labels/LabelInput.tsx
'use client';

import { useState } from 'react';

interface LabelInputProps {
  currentLabel?: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function LabelInput({ currentLabel, onSave, onCancel }: LabelInputProps) {
  const [label, setLabel] = useState(currentLabel || '');

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim());
      setLabel('');
    }
  };

  return (
    <div className="space-y-3 p-4 bg-blue-50 border border-blue-300 rounded-lg">
      <label className="block font-semibold text-gray-900">Label this path</label>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g., wing, beak, body"
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: LabelStep**

```typescript
// components/labels/LabelStep.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathLabels } from '@/hooks/usePathLabels';
import { useSvgSelection } from '@/hooks/useSvgSelection';
import { sanitizeSvgString } from '@/lib/sanitize';
import { LabelSidebar } from './LabelSidebar';
import { LabelInput } from './LabelInput';
import { DownloadButton } from '@/components/shared/DownloadButton';

interface LabelStepProps {
  svgString: string;
  onComplete: (svgString: string) => void;
}

export function LabelStep({ svgString, onComplete }: LabelStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgEl, setSvgEl] = useState<SVGElement | null>(null);
  const [isLabelMode, setIsLabelMode] = useState(false);
  const [editingPath, setEditingPath] = useState<SVGPathElement | null>(null);

  const { labels, extractLabels, addLabel } = usePathLabels(svgEl);
  const { selectedPathEl, selectPath, clearSelection } = useSvgSelection();

  // Mount SVG
  useEffect(() => {
    if (!svgString || !containerRef.current) return;

    try {
      const sanitized = sanitizeSvgString(svgString);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitized, 'image/svg+xml');

      if (doc.documentElement.tagName === 'parsererror') {
        throw new Error('Failed to parse SVG');
      }

      const svg = doc.documentElement as SVGElement;

      // Add click handlers
      let pathIndex = 0;
      svg.querySelectorAll('path').forEach((path) => {
        path.style.cursor = 'pointer';
        path.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isLabelMode) {
            selectPath(path, `path-${pathIndex}`);
            setEditingPath(path);
          }
        });
        pathIndex++;
      });

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(svg);

      setSvgEl(svg);
      extractLabels();
    } catch (err) {
      console.error('Error mounting SVG:', err);
    }
  }, [svgString, isLabelMode, extractLabels]);

  const handleLabelSave = (label: string) => {
    if (editingPath) {
      addLabel(editingPath, label);
      setEditingPath(null);
      clearSelection();
    }
  };

  const handleLabelClick = (label: string) => {
    if (!svgEl) return;

    // Find and highlight path with this label
    let pathIndex = 0;
    svgEl.querySelectorAll('path').forEach((path) => {
      if (path.getAttribute('data-label') === label) {
        selectPath(path, `path-${pathIndex}`);
      }
      pathIndex++;
    });
  };

  const handleExport = () => {
    if (svgEl) {
      const edited = new XMLSerializer().serializeToString(svgEl);
      onComplete(edited);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Label Shapes</h1>
        <p className="text-gray-600">Give names to individual paths to identify them</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setIsLabelMode(!isLabelMode)}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            isLabelMode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
          }`}
        >
          {isLabelMode ? '✓ Label Mode' : 'Enable Label Mode'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div
            ref={containerRef}
            className="border border-gray-300 rounded-lg bg-white p-4 min-h-96"
          />
        </div>

        <div className="space-y-6">
          {editingPath && isLabelMode ? (
            <LabelInput
              onSave={handleLabelSave}
              onCancel={() => {
                setEditingPath(null);
                clearSelection();
              }}
            />
          ) : (
            <LabelSidebar labels={labels} onLabelClick={handleLabelClick} />
          )}

          <div className="space-y-2">
            <DownloadButton svgString={svgString} labels={labels} fileName="labeled.svg" />
            <button
              onClick={handleExport}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/labels/
git commit -m "components: path labeling with sidebar and editor"
```

---

### Task 17: App — Layout & Config

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `next.config.ts`

- [ ] **Step 1: Update layout with CSP and root styling**

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SVGcraft',
  description: 'Free, client-side SVG vectorizer. No backend, no data leaves your device.',
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
        />
      </head>
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen">
          <header className="bg-white border-b border-gray-200 py-4 px-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900">
                SVGcraft
              </h1>
              <p className="text-sm text-gray-600">Free SVG vectorizer • All client-side • No data leaves your device</p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-6 py-12">
            {children}
          </main>
          <footer className="bg-gray-200 border-t border-gray-300 py-6 px-6 mt-12">
            <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
              <p>Made with ❤️ — <a href="https://github.com" className="text-blue-600 hover:underline">Open Source</a></p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update globals.css with Tailwind v4 directives**

```css
/* app/globals.css */
@import "tailwindcss";

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    @apply antialiased;
  }

  button:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

@layer components {
  .input-base {
    @apply px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition;
  }

  .button-primary {
    @apply px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400;
  }

  .button-secondary {
    @apply px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition;
  }
}
```

- [ ] **Step 3: Configure Next.js for static export**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css next.config.ts
git commit -m "config: Next.js static export, CSP, Tailwind setup"
```

---

### Task 18: App — Page Component

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Implement main page with 4-step wizard**

```typescript
// app/page.tsx
'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { UploadStep } from '@/components/upload/UploadStep';
import { VectorizeStep } from '@/components/vectorize/VectorizeStep';
import { ColorEditStep } from '@/components/colors/ColorEditStep';
import { LabelStep } from '@/components/labels/LabelStep';

type Step = 'upload' | 'vectorize' | 'colors' | 'labels';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);

  const stepIndex = {
    upload: 0,
    vectorize: 1,
    colors: 2,
    labels: 3,
  };

  const canGoBack = currentStep !== 'upload';

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto">
        <StepIndicator
          currentStep={stepIndex[currentStep]}
          totalSteps={4}
          onStepClick={(idx) => {
            const steps: Step[] = ['upload', 'vectorize', 'colors', 'labels'];
            if (idx <= stepIndex[currentStep] || (idx === 1 && imageData) || (idx === 2 && svgString) || (idx === 3 && svgString)) {
              setCurrentStep(steps[idx]);
            }
          }}
        />

        <div className="bg-white rounded-lg shadow-lg p-8">
          {currentStep === 'upload' && (
            <UploadStep
              onUploadComplete={(data) => {
                setImageData(data);
                setCurrentStep('vectorize');
              }}
            />
          )}

          {currentStep === 'vectorize' && imageData && (
            <VectorizeStep
              imageData={imageData}
              onVectorizeComplete={(svg) => {
                setSvgString(svg);
                setCurrentStep('colors');
              }}
            />
          )}

          {currentStep === 'colors' && svgString && (
            <ColorEditStep
              svgString={svgString}
              onColorsEdited={(svg) => {
                setSvgString(svg);
                setCurrentStep('labels');
              }}
            />
          )}

          {currentStep === 'labels' && svgString && (
            <LabelStep
              svgString={svgString}
              onComplete={(svg) => {
                setSvgString(svg);
                // Could add a summary/complete screen here
              }}
            />
          )}
        </div>

        {canGoBack && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                const steps: Step[] = ['upload', 'vectorize', 'colors', 'labels'];
                const prevIdx = Math.max(0, stepIndex[currentStep] - 1);
                setCurrentStep(steps[prevIdx]);
              }}
              className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "app: main page with 4-step wizard orchestration"
```

---

### Task 19: CI/CD — GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

- [ ] **Step 2: Add lint and build scripts to package.json**

```json
// Add to package.json scripts:
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext ts,tsx --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Create .eslintrc.json**

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .eslintrc.json
git commit -m "ci: GitHub Actions lint, typecheck, build"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: No errors, `out/` directory created with static assets.

- [ ] **Step 2: Test dev server**

```bash
npm run dev
```

Expected: App runs at http://localhost:3000; all 4 steps navigable.

- [ ] **Step 3: Test upload and vectorize**

Upload a test PNG, vectorize with default settings, verify SVG output.

- [ ] **Step 4: Test color editing**

In color editor, click a swatch, change color, verify it updates in preview.

- [ ] **Step 5: Test labeling**

In label step, enable label mode, click a path, add label, verify it appears in sidebar.

- [ ] **Step 6: Test download**

Download SVG with labels; verify file contains label legend comment.

- [ ] **Step 7: Commit verification success**

```bash
git add -A
git commit -m "test: full app verification — all 4 steps working"
```

---

## Summary

This plan builds SVGcraft in 20 modular tasks, each producing a small, testable piece:

1. **Types & Lib** (6 tasks) — Core utilities with no UI dependencies
2. **Worker & Hooks** (4 tasks) — Background processing and state management
3. **UI Components** (5 tasks) — Four-step wizard + shared chrome
4. **App & Config** (3 tasks) — Page orchestration, layout, static export config
5. **CI/CD** (1 task) — GitHub Actions pipeline
6. **Verification** (1 task) — End-to-end testing

Each task takes 5–15 minutes. Commits are frequent and logical, so git history is clean and reviewable.

**Key design decisions:**
- Worker isolates imagetracerjs; swappable if needed
- SVG sanitization at every boundary (parse, render)
- No dangerouslySetInnerHTML; always mount sanitized DOM
- Types defined upfront; strict no-`any`
- Modular components ≤200 lines for clarity
