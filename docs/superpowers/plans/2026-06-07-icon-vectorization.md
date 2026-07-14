# Icon Vectorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Icono limpio" vectorization mode that creates lightweight icon SVGs with a 4-color palette, removed white background, fewer noisy paths, and preserved recognizable shapes.

**Architecture:** Keep the existing general color and line-art modes. Add a focused icon pipeline that pre-cleans near-white backgrounds, snaps raster colors toward a small icon palette, traces with ImageTracer, then post-processes the SVG to remove white/transparent paths and normalize remaining colors. Put reusable color/path cleanup helpers in a small pure module so they can be tested outside the worker.

**Tech Stack:** TypeScript, React, Next.js App Router, ImageTracerJS, existing Web Worker pipeline, Vitest for focused helper tests.

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Add a `test` script if Vitest is installed during execution. |
| `vitest.config.ts` | Minimal Vitest config for pure TypeScript helper tests. |
| `lib/iconVectorization.ts` | New pure helper module for icon palette, color snapping, near-white removal, and SVG palette cleanup. |
| `lib/iconVectorization.test.ts` | Unit tests for the icon palette and SVG cleanup helpers. |
| `types/svg.types.ts` | Add `icon` to vectorization modes and add an `icon` preset. |
| `components/vectorize/VectorizeSettings.tsx` | Show the icon mode/preset in the settings UI. |
| `lib/i18n.tsx` | Add English/Spanish labels and help copy for icon mode. |
| `workers/vectorizer.worker.ts` | Add the icon-specific branch and call the helper module. |
| `docs/superpowers/specs/2026-06-07-icon-vectorization-design.md` | Source design already approved by the user. |

---

### Task 1: Add Focused Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/iconVectorization.test.ts`

- [ ] **Step 1: Add Vitest**

Run:

```powershell
npm install -D vitest
```

Expected: `package.json` and lockfile update with Vitest in `devDependencies`.

- [ ] **Step 2: Add a test script**

In `package.json`, update `scripts` to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write failing helper tests**

Create `lib/iconVectorization.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  ICON_VECTOR_PALETTE,
  nearestIconPaletteColor,
  removeNearWhiteSvgPaths,
  snapSvgToIconPalette,
} from './iconVectorization';

describe('icon vectorization helpers', () => {
  it('uses exactly the four icon colors', () => {
    expect(ICON_VECTOR_PALETTE).toEqual([
      { name: 'black', color: { r: 18, g: 18, b: 20 } },
      { name: 'cream', color: { r: 255, g: 246, b: 214 } },
      { name: 'pink', color: { r: 244, g: 105, b: 164 } },
      { name: 'shadow', color: { r: 150, g: 150, b: 146 } },
    ]);
  });

  it('snaps near-black, cream, pink, and gray colors to the icon palette', () => {
    expect(nearestIconPaletteColor({ r: 12, g: 13, b: 15 })).toEqual({ r: 18, g: 18, b: 20 });
    expect(nearestIconPaletteColor({ r: 253, g: 242, b: 205 })).toEqual({ r: 255, g: 246, b: 214 });
    expect(nearestIconPaletteColor({ r: 250, g: 118, b: 172 })).toEqual({ r: 244, g: 105, b: 164 });
    expect(nearestIconPaletteColor({ r: 142, g: 144, b: 143 })).toEqual({ r: 150, g: 150, b: 146 });
  });

  it('removes paths filled with white or near-white colors', () => {
    const svg = [
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(255,255,255)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(250,248,241)" d="M1 0L2 0Z"/>',
      '<path fill="rgb(18,18,20)" d="M2 0L3 0Z"/>',
      '</svg>',
    ].join('');

    const cleaned = removeNearWhiteSvgPaths(svg);

    expect(cleaned).not.toContain('rgb(255,255,255)');
    expect(cleaned).not.toContain('rgb(250,248,241)');
    expect(cleaned).toContain('rgb(18,18,20)');
  });

  it('snaps SVG fills and strokes to the icon palette', () => {
    const svg = [
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(11,12,13)" stroke="rgb(251,114,172)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(254,243,210)" d="M1 0L2 0Z"/>',
      '</svg>',
    ].join('');

    expect(snapSvgToIconPalette(svg)).toBe([
      '<svg viewBox="0 0 10 10">',
      '<path fill="rgb(18,18,20)" stroke="rgb(244,105,164)" d="M0 0L1 0Z"/>',
      '<path fill="rgb(255,246,214)" d="M1 0L2 0Z"/>',
      '</svg>',
    ].join(''));
  });
});
```

- [ ] **Step 5: Verify tests fail for the right reason**

Run:

```powershell
npm test -- --run
```

Expected: FAIL because `lib/iconVectorization.ts` does not exist yet.

---

### Task 2: Implement Icon Palette Helpers

**Files:**
- Create: `lib/iconVectorization.ts`
- Test: `lib/iconVectorization.test.ts`

- [ ] **Step 1: Create the helper module**

Create `lib/iconVectorization.ts`:

```typescript
import { RGBColor } from '@/types/svg.types';
import { colorDistanceSq, rgbToString } from './colorUtils';

export const ICON_VECTOR_PALETTE = [
  { name: 'black', color: { r: 18, g: 18, b: 20 } },
  { name: 'cream', color: { r: 255, g: 246, b: 214 } },
  { name: 'pink', color: { r: 244, g: 105, b: 164 } },
  { name: 'shadow', color: { r: 150, g: 150, b: 146 } },
] as const;

export type IconPaletteColor = (typeof ICON_VECTOR_PALETTE)[number];

export function isNearWhite(color: RGBColor, threshold = 244): boolean {
  return color.r >= threshold && color.g >= threshold && color.b >= threshold;
}

export function nearestIconPaletteColor(color: RGBColor): RGBColor {
  let nearest = ICON_VECTOR_PALETTE[0].color;
  let best = colorDistanceSq(color, nearest);

  for (const entry of ICON_VECTOR_PALETTE.slice(1)) {
    const distance = colorDistanceSq(color, entry.color);
    if (distance < best) {
      best = distance;
      nearest = entry.color;
    }
  }

  return nearest;
}

export function removeNearWhitePixels(imageData: ImageData, threshold = 244): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 16) continue;
    if (isNearWhite({ r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] }, threshold)) {
      out.data[i + 3] = 0;
    }
  }

  return out;
}

export function quantizeImageToIconPalette(imageData: ImageData): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 16) continue;
    const snapped = nearestIconPaletteColor({
      r: out.data[i],
      g: out.data[i + 1],
      b: out.data[i + 2],
    });
    out.data[i] = snapped.r;
    out.data[i + 1] = snapped.g;
    out.data[i + 2] = snapped.b;
  }

  return out;
}

export function removeNearWhiteSvgPaths(svg: string, threshold = 244): string {
  return svg.replace(/<path\b[^>]*\bfill="rgb\((\d+),\s*(\d+),\s*(\d+)\)"[^>]*>/g, (tag, r, g, b) => {
    const color = { r: Number(r), g: Number(g), b: Number(b) };
    return isNearWhite(color, threshold) ? '' : tag;
  });
}

export function snapSvgToIconPalette(svg: string): string {
  return svg.replace(
    /(fill|stroke)="rgb\((\d+),\s*(\d+),\s*(\d+)\)"/g,
    (_full, attr: string, r: string, g: string, b: string) => {
      const snapped = nearestIconPaletteColor({ r: Number(r), g: Number(g), b: Number(b) });
      return `${attr}="${rgbToString(snapped)}"`;
    }
  );
}

export function iconTracePalette(): Array<RGBColor & { a: number }> {
  return ICON_VECTOR_PALETTE.map((entry) => ({ ...entry.color, a: 255 }));
}
```

- [ ] **Step 2: Run helper tests**

Run:

```powershell
npm test -- --run lib/iconVectorization.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run type-check**

Run:

```powershell
npm run type-check
```

Expected: PASS.

---

### Task 3: Add Icon Mode and Preset to Settings

**Files:**
- Modify: `types/svg.types.ts`
- Modify: `components/vectorize/VectorizeSettings.tsx`
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Update vectorization mode type**

In `types/svg.types.ts`, change:

```typescript
mode: 'color' | 'lineart';
```

to:

```typescript
mode: 'icon' | 'color' | 'lineart';
```

- [ ] **Step 2: Add the icon preset name**

Change:

```typescript
export interface VectorizePreset {
  name: 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}
```

to:

```typescript
export interface VectorizePreset {
  name: 'icon' | 'logo' | 'sketch' | 'photo';
  settings: Partial<VectorizeSettings>;
}
```

- [ ] **Step 3: Add the icon preset and make it the default**

In `VECTORIZE_PRESETS`, add `icon` before `logo`:

```typescript
icon: {
  mode: 'icon',
  numberofcolors: 4,
  ltres: 2.4,
  qtres: 2.2,
  colorsampling: 0,
  strokewidth: 1,
  scale: 1,
  pathomit: 34,
  roundcoords: 1,
  blurRadius: 1,
  vtracerFilterSpeckle: 4,
  vtracerCornerThreshold: 60,
  vtracerSpliceThreshold: 45,
},
```

Then change `VECTORIZE_DEFAULTS` to the same values as the `icon` preset so the product opens optimized for icons.

- [ ] **Step 4: Update preset translation keys**

In `components/vectorize/VectorizeSettings.tsx`, change `PRESET_KEYS` to:

```typescript
const PRESET_KEYS: Record<keyof typeof VECTORIZE_PRESETS, TKey> = {
  icon: 'set.preset.icon',
  logo: 'set.preset.logo',
  sketch: 'set.preset.sketch',
  photo: 'set.preset.photo',
};
```

- [ ] **Step 5: Include icon in the mode toggle**

Replace:

```typescript
{(['color', 'lineart'] as const).map((m) => (
```

with:

```typescript
{(['icon', 'color', 'lineart'] as const).map((m) => (
```

Replace the label expression:

```typescript
{t(m === 'color' ? 'set.mode.color' : 'set.mode.lineart')}
```

with:

```typescript
{t(m === 'icon' ? 'set.mode.icon' : m === 'color' ? 'set.mode.color' : 'set.mode.lineart')}
```

- [ ] **Step 6: Show color controls in icon mode**

Replace:

```typescript
{settings.mode === 'color' && (
```

with:

```typescript
{(settings.mode === 'icon' || settings.mode === 'color') && (
```

Do this for both the basic color-count control and the advanced `ltres` / `qtres` controls.

- [ ] **Step 7: Add i18n copy**

In `lib/i18n.tsx`, add:

```typescript
'set.preset.icon': { en: 'Clean icon', es: 'Icono limpio' },
'set.mode.icon': { en: 'Icon', es: 'Icono' },
```

Update `set.mode.help` to:

```typescript
'set.mode.help': {
  en: 'Icon: 4-color lightweight tracing for icons. Color: general full-color tracing. Line art: black & white tracing with VTracer.',
  es: 'Icono: trazado liviano de 4 colores para iconos. Color: trazado general a todo color. Líneas: trazado en blanco y negro con VTracer.'
},
```

- [ ] **Step 8: Run type-check**

Run:

```powershell
npm run type-check
```

Expected: PASS.

---

### Task 4: Implement the Icon Worker Pipeline

**Files:**
- Modify: `workers/vectorizer.worker.ts`
- Test: `lib/iconVectorization.test.ts`

- [ ] **Step 1: Import icon helpers**

At the top of `workers/vectorizer.worker.ts`, add:

```typescript
import {
  iconTracePalette,
  quantizeImageToIconPalette,
  removeNearWhitePixels,
  removeNearWhiteSvgPaths,
  snapSvgToIconPalette,
} from '@/lib/iconVectorization';
```

- [ ] **Step 2: Add `vectorizeIcon` helper**

Add this function before `vectorizeImage()`:

```typescript
function vectorizeIcon(imageData: ImageData, settings: VectorizeSettings): string {
  const withoutWhite = removeNearWhitePixels(imageData);
  const iconRaster = quantizeImageToIconPalette(withoutWhite);
  const palette = iconTracePalette();

  const svgString = ImageTracer.imagedataToSVG(iconRaster, {
    numberofcolors: palette.length,
    pal: palette,
    colorquantcycles: 1,
    mincolorratio: 0,
    ltres: settings.ltres,
    qtres: settings.qtres,
    colorsampling: 0,
    strokewidth: settings.strokewidth,
    scale: settings.scale,
    pathomit: settings.pathomit,
    roundcoords: settings.roundcoords,
    desc: false,
    viewbox: true,
  });

  const withoutTransparent = removeTransparentPaths(svgString);
  const withoutWhitePaths = removeNearWhiteSvgPaths(withoutTransparent);
  const snapped = snapSvgToIconPalette(withoutWhitePaths);
  const withoutSpeckles = removeTinyPaths(snapped, Math.max(settings.pathomit, 30));

  return optimizeSvg(withoutSpeckles, {
    dropDefaultOpacity: true,
    coordDecimals: settings.roundcoords,
    sealSeams: 0.6,
  });
}
```

- [ ] **Step 3: Branch before line-art/general color**

In `vectorizeImage()`, after blur is created and before the `lineart` branch, add:

```typescript
if (options.mode === 'icon') {
  optimized = vectorizeIcon(blurred, {
    ...options,
    numberofcolors: 4,
    pathomit: Math.max(options.pathomit, 30),
  });
} else if (options.mode === 'lineart') {
```

Then change the existing `if (options.mode === 'lineart')` to the `else if` shown above.

- [ ] **Step 4: Keep general color behavior unchanged**

Do not modify the existing general color branch except for the `else if` structure needed by Step 3. This keeps photo/logo behavior stable.

- [ ] **Step 5: Run tests and type-check**

Run:

```powershell
npm test -- --run
npm run type-check
```

Expected: both PASS.

---

### Task 5: Polish UI Behavior for an Icon-First Product

**Files:**
- Modify: `components/vectorize/VectorizeSettings.tsx`
- Modify: `components/vectorize/VectorizeStep.tsx`
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Put "Icono limpio" first**

Because `VECTORIZE_PRESETS` preserves object insertion order in the current UI, keep `icon` as the first key in `VECTORIZE_PRESETS`.

- [ ] **Step 2: Explain background behavior**

In `lib/i18n.tsx`, update `set.colors.help` to mention icon mode:

```typescript
'set.colors.help': {
  en: 'How many distinct colors the vector will use. Icon mode is optimized for 4 clean colors.',
  es: 'Cuántos colores distintos usará el vector. El modo Icono está optimizado para 4 colores limpios.'
},
```

- [ ] **Step 3: Keep the manual background toggle**

Do not remove the existing "Quitar fondo" controls in `VectorizeStep.tsx`. Icon mode already removes near-white pixels inside the worker, and the manual toggle remains useful for non-white or difficult backgrounds.

- [ ] **Step 4: Add a small icon-mode hint under the palette controls**

In `VectorizeSettings.tsx`, after the color-count hint:

```tsx
{settings.mode === 'icon' && (
  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
    {t('set.icon.hint')}
  </p>
)}
```

In `lib/i18n.tsx`, add:

```typescript
'set.icon.hint': {
  en: 'Best for icon assets: removes white background, keeps 4 clean colors, and reduces noisy paths.',
  es: 'Ideal para assets de iconos: quita fondo blanco, conserva 4 colores limpios y reduce paths ruidosos.'
},
```

- [ ] **Step 5: Run lint and type-check**

Run:

```powershell
npm run lint
npm run type-check
```

Expected: both PASS.

---

### Task 6: Manual Visual Validation

**Files:**
- Use the app UI with the provided icon image.
- No code files should change in this task unless validation finds a bug.

- [ ] **Step 1: Start the app if it is not already running**

Run:

```powershell
npm run dev
```

Expected: Next.js starts and prints a local URL.

- [ ] **Step 2: Upload the sample icon**

Use the app to upload the icon image from the conversation or an equivalent local sample.

Expected:

- Default preset is `Icono limpio`.
- SVG preview uses only black, cream, pink, and gray/shadow colors.
- White background is not present in the palette.
- The visible shape remains recognizable.
- Borders look less fragmented than the previous output.

- [ ] **Step 3: Compare against general color mode**

Switch from `Icono` to `Color`.

Expected:

- General color mode still works.
- It may produce more colors/paths than icon mode.
- Switching back to `Icono` returns to the cleaner 4-color output.

- [ ] **Step 4: Check file size and path count**

Use the UI size label and optional console inspection. The icon-mode SVG should be smaller or similarly small compared with the previous default output while using fewer visible colors.

- [ ] **Step 5: Record final tuning values if needed**

If icon mode is too angular, lower `ltres` / `qtres` slightly. If icon mode is too noisy, raise `pathomit` or keep `blurRadius` at `1`. Keep final values in `types/svg.types.ts`.

---

### Task 7: Final Verification

**Files:**
- All modified files.

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm test -- --run
npm run lint
npm run type-check
npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Review git diff**

Run:

```powershell
git diff -- package.json vitest.config.ts lib/iconVectorization.ts lib/iconVectorization.test.ts types/svg.types.ts components/vectorize/VectorizeSettings.tsx components/vectorize/VectorizeStep.tsx lib/i18n.tsx workers/vectorizer.worker.ts
```

Expected:

- Changes are limited to icon vectorization behavior, tests, and labels.
- Existing `color` and `lineart` modes remain available.
- No generated build artifacts are included.

- [ ] **Step 3: Commit only if the user explicitly asks**

This repository instruction says not to create commits unless the user asks. If the user asks for a commit, use a message like:

```text
feat: add clean icon vectorization mode
```

---

## Self-Review

- Spec coverage: The plan covers a clear icon option, 4-color palette, white background removal, fewer noisy paths, less destructive simplification, UI labels, and visual/technical validation.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: `mode: 'icon' | 'color' | 'lineart'`, `set.mode.icon`, `set.preset.icon`, and `set.icon.hint` are used consistently across tasks.
- Scope check: This is one cohesive subsystem: vectorization preset/pipeline for icon output.
