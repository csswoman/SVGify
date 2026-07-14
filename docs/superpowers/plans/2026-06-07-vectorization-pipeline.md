# Vectorization Pipeline Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-trace blur, a line art / B&W mode powered by VTracer WASM, and expose the new controls in the settings UI.

**Architecture:** All image processing stays in the web worker (`workers/vectorizer.worker.ts`). The worker branches on `settings.mode`: `'color'` follows the existing ImageTracer pipeline; `'lineart'` applies Otsu binarization then delegates to VTracer's `BinaryImageConverter`. Blur (box blur 2-pass) is applied to the raw `ImageData` before any branching. UI additions are confined to `VectorizeSettings.tsx` and new i18n keys in `lib/i18n.tsx`.

**Tech Stack:** TypeScript, React, Next.js (App Router), Tailwind CSS, ImageTracerJS, vectortracer (VTracer WASM bindings), Web Workers.

---

## File Map

| File | Change |
|---|---|
| `types/svg.types.ts` | Add `mode`, `blurRadius`, `vtracerFilterSpeckle`, `vtracerCornerThreshold`, `vtracerSpliceThreshold` to `VectorizeSettings`; update presets & defaults |
| `workers/vectorizer.worker.ts` | Add `applyBlur()`, `binarizeOtsu()`, `vectorizeLineart()`; async WASM init; branch on `mode` |
| `components/vectorize/VectorizeSettings.tsx` | Mode toggle, blur slider, conditional VTracer params in advanced section |
| `lib/i18n.tsx` | New translation keys for mode, blur, and VTracer controls |

---

### Task 1: Extend VectorizeSettings types and presets

**Files:**
- Modify: `types/svg.types.ts`

- [ ] **Step 1: Update the `VectorizeSettings` interface**

Replace the existing interface (lines 25–34) with:

```typescript
export interface VectorizeSettings {
  mode: 'color' | 'lineart';
  numberofcolors: number;      // 2-12 (ignored in lineart mode)
  ltres: number;               // 0.1-5
  qtres: number;               // 0.1-5
  colorsampling: number;
  strokewidth: number;         // 1-5
  scale: number;
  pathomit: number;
  roundcoords: number;
  blurRadius: number;          // 0 = off, 1-5
  vtracerFilterSpeckle: number;    // 2-16, VTracer noise filter
  vtracerCornerThreshold: number;  // 60-170 degrees
  vtracerSpliceThreshold: number;  // 15-90 degrees
}
```

- [ ] **Step 2: Update `VECTORIZE_PRESETS`**

Replace the existing `VECTORIZE_PRESETS` constant (lines 41–72) with:

```typescript
export const VECTORIZE_PRESETS: Record<VectorizePreset['name'], VectorizeSettings> = {
  logo: {
    mode: 'color',
    numberofcolors: 5,
    ltres: 3.5,
    qtres: 3.5,
    colorsampling: 2,
    strokewidth: 1,
    scale: 1,
    pathomit: 28,
    roundcoords: 0,
    blurRadius: 0,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
  sketch: {
    mode: 'lineart',
    numberofcolors: 2,
    ltres: 2.5,
    qtres: 2.5,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 24,
    roundcoords: 1,
    blurRadius: 1,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
  photo: {
    mode: 'color',
    numberofcolors: 10,
    ltres: 2,
    qtres: 2,
    colorsampling: 0,
    strokewidth: 1,
    scale: 1,
    pathomit: 20,
    roundcoords: 0,
    blurRadius: 1,
    vtracerFilterSpeckle: 4,
    vtracerCornerThreshold: 60,
    vtracerSpliceThreshold: 45,
  },
};
```

- [ ] **Step 3: Update `VECTORIZE_DEFAULTS`**

Replace the existing `VECTORIZE_DEFAULTS` constant (lines 74–85) with:

```typescript
export const VECTORIZE_DEFAULTS: VectorizeSettings = {
  mode: 'color',
  numberofcolors: 6,
  ltres: 2.8,
  qtres: 2.8,
  colorsampling: 2,
  strokewidth: 1,
  scale: 1,
  pathomit: 24,
  roundcoords: 0,
  blurRadius: 1,
  vtracerFilterSpeckle: 4,
  vtracerCornerThreshold: 60,
  vtracerSpliceThreshold: 45,
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd d:\proyectos\svg-tool && npx tsc --noEmit
```

Expected: errors only about `mode`/`blurRadius` not existing in the worker yet (those get fixed in Task 2). Zero errors about the types file itself.

- [ ] **Step 5: Commit**

```bash
git add types/svg.types.ts
git commit -m "feat: add mode, blurRadius, and vtracer fields to VectorizeSettings"
```

---

### Task 2: Add blur and binarization helpers + VTracer pipeline in the worker

**Files:**
- Modify: `workers/vectorizer.worker.ts`

- [ ] **Step 1: Add vectortracer import and async WASM init**

At the top of the file, after the existing imports (after line 5), add:

```typescript
import { main as vtracerInit, BinaryImageConverter } from 'vectortracer';

// Initialize VTracer WASM once when the worker starts.
let vtracerReady = false;
(async () => {
  try {
    await vtracerInit();
    vtracerReady = true;
  } catch {
    // WASM load failed — lineart mode will fall back gracefully
  }
})();
```

- [ ] **Step 2: Add `applyBlur()` function**

Add this function before `vectorizeImage()` (before line 23):

```typescript
function applyBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;
  const r = Math.round(radius);
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const dst = new Uint8ClampedArray(data.length);

  // Two-pass box blur (horizontal then vertical) approximates Gaussian.
  const passes: Array<[Uint8ClampedArray, Uint8ClampedArray]> = [
    [src, dst],
    [dst, src],
  ];

  for (const [input, output] of passes) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
        for (let dx = -r; dx <= r; dx++) {
          const nx = Math.min(Math.max(x + dx, 0), width - 1);
          const idx = (y * width + nx) * 4;
          rSum += input[idx];
          gSum += input[idx + 1];
          bSum += input[idx + 2];
          aSum += input[idx + 3];
          count++;
        }
        const oi = (y * width + x) * 4;
        output[oi]     = rSum / count;
        output[oi + 1] = gSum / count;
        output[oi + 2] = bSum / count;
        output[oi + 3] = aSum / count;
      }
    }
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = Math.min(Math.max(y + dy, 0), height - 1);
          const idx = (ny * width + x) * 4;
          rSum += input[idx];
          gSum += input[idx + 1];
          bSum += input[idx + 2];
          aSum += input[idx + 3];
          count++;
        }
        const oi = (y * width + x) * 4;
        output[oi]     = rSum / count;
        output[oi + 1] = gSum / count;
        output[oi + 2] = bSum / count;
        output[oi + 3] = aSum / count;
      }
    }
  }

  return new ImageData(src, width, height);
}
```

- [ ] **Step 3: Add `binarizeOtsu()` function**

Add this function after `applyBlur()`:

```typescript
function binarizeOtsu(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;

  // Build grayscale histogram.
  const hist = new Float64Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[gray]++;
  }

  // Otsu's method to find optimal threshold.
  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > maxVar) { maxVar = between; threshold = t; }
  }

  // Apply threshold: dark pixels → black (0), light → white (255).
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const val = gray <= threshold ? 0 : 255;
    out[i] = out[i + 1] = out[i + 2] = val;
    out[i + 3] = data[i + 3];
  }
  return new ImageData(out, width, height);
}
```

- [ ] **Step 4: Add `vectorizeLineart()` function**

Add this function after `binarizeOtsu()`:

```typescript
function vectorizeLineart(imageData: ImageData, settings: VectorizeSettings): string {
  if (!vtracerReady) throw new Error('VTracer WASM not ready');

  const converter = new BinaryImageConverter(
    imageData,
    {
      debug: false,
      mode: 'spline',
      cornerThreshold: settings.vtracerCornerThreshold,
      spliceThreshold: settings.vtracerSpliceThreshold,
      filterSpeckle: settings.vtracerFilterSpeckle,
      pathPrecision: settings.roundcoords > 0 ? settings.roundcoords : 2,
    },
    {
      invert: false,
      pathFill: '#000000',
      backgroundColor: undefined,
      attributes: undefined,
    }
  );

  converter.init();
  while (converter.tick()) { /* iterate until done */ }
  const svg = converter.getResult();
  converter.free();
  return svg;
}
```

- [ ] **Step 5: Update `vectorizeImage()` to branch on mode**

Replace the body of `vectorizeImage()` (lines 23–74) with:

```typescript
function vectorizeImage(imageData: ImageData, settings: VectorizeSettings): void {
  try {
    const options = { ...VECTORIZE_DEFAULTS, ...settings };

    // Apply blur before any tracing.
    const blurred = applyBlur(imageData, options.blurRadius);

    let optimized: string;

    if (options.mode === 'lineart') {
      const binary = binarizeOtsu(blurred);
      const svg = vectorizeLineart(binary, options);
      optimized = optimizeSvg(svg, {
        dropDefaultOpacity: true,
        coordDecimals: options.roundcoords,
        removeStroke: false,
      });
    } else {
      // ── Existing color pipeline ──
      const targetColors = Math.min(options.numberofcolors, 12);
      const effectivePathOmit =
        targetColors >= 10
          ? Math.min(options.pathomit, 10)
          : targetColors >= 7
            ? Math.min(options.pathomit, 16)
            : options.pathomit;

      const { imageData: tracedImageData, palette } = quantizeToDominantPalette(blurred, targetColors);

      const svgString = ImageTracer.imagedataToSVG(tracedImageData, {
        numberofcolors: palette.length,
        pal: palette,
        colorquantcycles: 1,
        mincolorratio: 0,
        ltres: options.ltres,
        qtres: options.qtres,
        colorsampling: 0,
        strokewidth: options.strokewidth,
        scale: options.scale,
        pathomit: effectivePathOmit,
        roundcoords: options.roundcoords,
        desc: false,
        viewbox: true,
      });

      const withoutTransparent = removeTransparentPaths(svgString);
      const normalized = normalizeSvgPalette(withoutTransparent, targetColors >= 7 ? 18 : 32, targetColors);
      const withoutSpeckles = removeTinyPaths(normalized, Math.max(effectivePathOmit, targetColors >= 10 ? 8 : 16));
      const simplified = simplifySvgPaths(withoutSpeckles, 1.1, options.roundcoords);

      optimized = optimizeSvg(simplified, {
        dropDefaultOpacity: true,
        coordDecimals: options.roundcoords,
        removeStroke: true,
      });
    }

    self.postMessage({ type: 'done', svg: optimized } satisfies WorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vectorization failed';
    self.postMessage({ type: 'error', message } satisfies WorkerResponse);
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd d:\proyectos\svg-tool && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add workers/vectorizer.worker.ts
git commit -m "feat: add blur pre-trace, Otsu binarization, and VTracer lineart pipeline"
```

---

### Task 3: Add i18n translation keys

**Files:**
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Add new keys to `DICT`**

In `lib/i18n.tsx`, inside the `DICT` object, after the `'set.precision.help'` entry (after line 74), add:

```typescript
  // Mode toggle
  'set.mode': { en: 'Mode', es: 'Modo' },
  'set.mode.color': { en: 'Color', es: 'Color' },
  'set.mode.lineart': { en: 'Line art', es: 'Líneas' },
  'set.mode.help': { en: 'Color: full-color tracing with ImageTracer. Line art: black & white tracing with VTracer — ideal for sketches and drawings.', es: 'Color: trazado a todo color con ImageTracer. Líneas: trazado en blanco y negro con VTracer — ideal para bocetos y dibujos.' },

  // Blur
  'set.blur': { en: 'Pre-blur', es: 'Desenfoque previo' },
  'set.blur.hint': { en: '0 = off · Higher = smoother edges, fewer paths.', es: '0 = desactivado · Más alto = bordes más suaves, menos paths.' },
  'set.blur.help': { en: 'Applies a light blur before tracing. Reduces noise and prevents fragmented paths. 0 disables it.', es: 'Aplica un desenfoque ligero antes de trazar. Reduce el ruido y evita paths fragmentados. 0 lo desactiva.' },

  // VTracer controls (lineart mode)
  'set.vt.speckle': { en: 'Speckle filter', es: 'Filtro de motas' },
  'set.vt.speckle.hint': { en: 'Higher = removes more tiny specs.', es: 'Más alto = elimina más motas pequeñas.' },
  'set.vt.speckle.help': { en: 'Removes stray pixels smaller than this size. Higher = cleaner result but may lose fine detail.', es: 'Elimina píxeles sueltos menores a este tamaño. Más alto = resultado más limpio pero puede perder detalle fino.' },
  'set.vt.corner': { en: 'Corner threshold', es: 'Umbral de esquinas' },
  'set.vt.corner.hint': { en: 'Higher = smoother corners.', es: 'Más alto = esquinas más suaves.' },
  'set.vt.corner.help': { en: 'Angle below which a point is treated as a corner. Higher = rounder shapes; lower = sharper corners.', es: 'Ángulo por debajo del cual un punto es tratado como esquina. Más alto = formas más redondeadas; más bajo = esquinas más marcadas.' },
  'set.vt.splice': { en: 'Curve tolerance', es: 'Tolerancia de curva' },
  'set.vt.splice.hint': { en: 'Higher = smoother, fewer segments.', es: 'Más alto = más suave, menos segmentos.' },
  'set.vt.splice.help': { en: 'How aggressively curves are joined. Higher = fewer path segments, smoother result.', es: 'Qué tan agresivamente se unen las curvas. Más alto = menos segmentos, resultado más suave.' },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd d:\proyectos\svg-tool && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n.tsx
git commit -m "feat: add i18n keys for mode toggle, blur, and VTracer controls"
```

---

### Task 4: Update the settings UI

**Files:**
- Modify: `components/vectorize/VectorizeSettings.tsx`

- [ ] **Step 1: Add mode toggle in the Basic section**

In `VectorizeSettings.tsx`, after the presets block (after the closing `</div>` of the presets section, around line 66), add the mode toggle before the colors slider:

```tsx
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('set.mode')}
            <Tooltip text={t('set.mode.help')} label={t('set.mode')} />
          </label>
          <div className="flex gap-2">
            {(['color', 'lineart'] as const).map((m) => (
              <button
                key={m}
                onClick={() => onSettingsChange({ ...settings, mode: m })}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                  settings.mode === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50 dark:hover:text-blue-300'
                }`}
              >
                {t(m === 'color' ? 'set.mode.color' : 'set.mode.lineart')}
              </button>
            ))}
          </div>
        </div>
```

- [ ] **Step 2: Add blur slider in the Basic section**

After the mode toggle block (still in the Basic section, before the closing `</div>` of the basic section around line 66), add:

```tsx
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('set.blur')}: <span className="font-mono ml-1">{settings.blurRadius}</span>
            <Tooltip text={t('set.blur.help')} label={t('set.blur')} />
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={settings.blurRadius}
            onChange={(e) => onSettingsChange({ ...settings, blurRadius: Number(e.target.value) })}
            className="w-full accent-blue-600"
            aria-label={`${t('set.blur')}: ${settings.blurRadius}`}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.blur.hint')}</p>
        </div>
```

- [ ] **Step 3: Hide colors slider when in lineart mode**

Wrap the colors slider `<div>` (lines 48–65) in a conditional:

```tsx
        {settings.mode === 'color' && (
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('set.colors')}: <span className="font-mono ml-1">{settings.numberofcolors}</span>
              <Tooltip text={t('set.colors.help')} label={t('set.colors')} />
            </label>
            <input
              type="range"
              min={2}
              max={12}
              value={settings.numberofcolors}
              onChange={(e) =>
                onSettingsChange({ ...settings, numberofcolors: Number(e.target.value) })
              }
              className="w-full accent-blue-600"
              aria-label={`${t('set.colors')}: ${settings.numberofcolors}`}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.colors.hint')}</p>
          </div>
        )}
```

- [ ] **Step 4: Add VTracer controls in Advanced section (conditional on lineart mode)**

Inside the `{showAdvanced && (` block in the Advanced section (after line 79), add the VTracer params block at the end (before the closing `</div>` of the advanced section):

```tsx
            {settings.mode === 'lineart' && (
              <>
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('set.vt.speckle')}: <span className="font-mono ml-1">{settings.vtracerFilterSpeckle}</span>
                    <Tooltip text={t('set.vt.speckle.help')} label={t('set.vt.speckle')} />
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    value={settings.vtracerFilterSpeckle}
                    onChange={(e) => onSettingsChange({ ...settings, vtracerFilterSpeckle: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                    aria-label={`${t('set.vt.speckle')}: ${settings.vtracerFilterSpeckle}`}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.vt.speckle.hint')}</p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('set.vt.corner')}: <span className="font-mono ml-1">{settings.vtracerCornerThreshold}°</span>
                    <Tooltip text={t('set.vt.corner.help')} label={t('set.vt.corner')} />
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={170}
                    step={5}
                    value={settings.vtracerCornerThreshold}
                    onChange={(e) => onSettingsChange({ ...settings, vtracerCornerThreshold: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                    aria-label={`${t('set.vt.corner')}: ${settings.vtracerCornerThreshold}`}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.vt.corner.hint')}</p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('set.vt.splice')}: <span className="font-mono ml-1">{settings.vtracerSpliceThreshold}°</span>
                    <Tooltip text={t('set.vt.splice.help')} label={t('set.vt.splice')} />
                  </label>
                  <input
                    type="range"
                    min={15}
                    max={90}
                    step={5}
                    value={settings.vtracerSpliceThreshold}
                    onChange={(e) => onSettingsChange({ ...settings, vtracerSpliceThreshold: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                    aria-label={`${t('set.vt.splice')}: ${settings.vtracerSpliceThreshold}`}
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('set.vt.splice.hint')}</p>
                </div>
              </>
            )}
```

- [ ] **Step 5: Also hide smoothing/detail sliders when in lineart mode**

Wrap the smoothing and detail slider blocks (lines 80–113) in `{settings.mode === 'color' && (`:

```tsx
            {settings.mode === 'color' && (
              <>
                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('set.smoothing')}: <span className="font-mono ml-1">{settings.ltres.toFixed(1)}</span>
                    <Tooltip text={t('set.smoothing.help')} label={t('set.smoothing')} />
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={settings.ltres}
                    onChange={(e) => onSettingsChange({ ...settings, ltres: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                    aria-label={`${t('set.smoothing')}: ${settings.ltres}`}
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('set.detail')}: <span className="font-mono ml-1">{settings.qtres.toFixed(1)}</span>
                    <Tooltip text={t('set.detail.help')} label={t('set.detail')} />
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={settings.qtres}
                    onChange={(e) => onSettingsChange({ ...settings, qtres: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600"
                    aria-label={`${t('set.detail')}: ${settings.qtres}`}
                  />
                </div>
              </>
            )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd d:\proyectos\svg-tool && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add components/vectorize/VectorizeSettings.tsx
git commit -m "feat: add mode toggle, blur slider, and VTracer controls to settings UI"
```

---

### Task 5: Smoke-test the full pipeline

- [ ] **Step 1: Start the dev server**

```bash
cd d:\proyectos\svg-tool && npm run dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 2: Test color mode with blur**

1. Upload a photo (PNG or JPG).
2. Confirm the mode toggle shows "Color" selected by default.
3. Set Pre-blur to 2 and re-vectorize — result should have softer edges and fewer fragmented paths than with blur=0.
4. Confirm colors slider is visible.

- [ ] **Step 3: Test line art mode**

1. Upload a sketch or line drawing.
2. Click "Line art" in the mode toggle.
3. Confirm: colors slider disappears, smoothing/detail sliders disappear, VTracer controls appear in Advanced.
4. Click "Sketch / Line art" preset — confirm it auto-selects lineart mode.
5. Vectorize — result should be a clean black-and-white SVG.

- [ ] **Step 4: Test the sketch preset**

1. Click "Sketch / Line art" preset button.
2. Verify `mode` is set to `lineart` and blur is 1.
3. Vectorize a hand-drawn image — confirm clean B&W output.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: smoke-test vectorization pipeline enhancements complete"
```

---

## Notes

- **VTracer WASM init is async** — if the user vectorizes before `vtracerReady` is true, they get a clear error message: `"VTracer WASM not ready"`. In practice, WASM loads in < 200 ms, so this is rarely hit.
- **`applyBlur` with `radius=0`** returns the original `ImageData` unchanged — no allocation.
- **`binarizeOtsu`** picks the threshold automatically from the image histogram — no user-facing threshold control needed.
- **Color pipeline is unchanged** — the only change is `blurred` replaces `imageData` as input to `quantizeToDominantPalette`.
