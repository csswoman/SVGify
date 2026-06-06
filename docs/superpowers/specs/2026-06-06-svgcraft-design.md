# SVGcraft — Design Spec

**Date:** 2026-06-06
**Status:** Approved (pending user review of this doc)

## What it is

A free, open-source, **browser-only** SVG vectorizer web app. Converts raster
images (PNG/JPG/WEBP) to SVG, lets the user edit colors, and label individual
paths. Everything runs client-side: no backend, no API, no auth, no network at
runtime. This is both a privacy feature and a security guarantee — uploaded
images and the resulting SVGs never leave the device.

## Tech stack (all verified present on npm 2026-06-06)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js **16.2.7** | App Router, TypeScript, `output: 'export'` (static) |
| UI | React **19** | |
| Styling | Tailwind CSS **v4** | `@theme` directive in CSS; no `tailwind.config.js` |
| Vectorize engine | **`vectortracer@0.1.2`** | vtracer Rust→WASM bindings, ESM, MIT, TS types, 0 deps |
| Fallback engine | `imagetracerjs@1.2.6` | Pure JS. ONLY if WASM init genuinely fails after debugging; ask user first |
| Heavy work | Web Worker | WASM runs off the main thread |

**Engine note:** the originally-requested `@alanscodelog/vectortracer` does not
exist on npm (404). The correct package is the unscoped **`vectortracer`**.

## Architecture

### The adapter boundary (key decision)

`vectortracer` has 0 dependents and is ~2 years old. To contain that risk, it is
imported in exactly ONE file — the worker. Everything else speaks a generic
message API.

```
UI components
   │  (props/state)
page.tsx  ── top-level state only ──┐
   │                                │
useVectorizer hook                  │
   │  postMessage / onmessage       │
vectorizer.worker.ts  ◄── ONLY importer of vectortracer
   │
vectortracer WASM  (+ /public/wasm/*.wasm fetched by URL)
```

If `vectortracer` ever breaks or is swapped for `imagetracerjs`, only the worker
+ its message types change. The hook and UI are insulated.

### Worker message API

```ts
// to worker
{ type: 'vectorize'; imageData: ImageData; settings: VectorizeSettings }
{ type: 'cancel' }
// from worker
{ type: 'ready' }                       // WASM initialized
{ type: 'progress'; value: number }     // 0..1, drives progress bar
{ type: 'done'; svg: string }
{ type: 'error'; message: string }      // user-friendly, never a raw stack
```

### Worker lifecycle (vectortracer specifics)

vectortracer is class-based and incremental, not one-shot:

1. Pick converter by mode: `ColorImageConverter` (color) or
   `BinaryImageConverter` (b/w).
2. `new Converter(imageData, vtracerParams, options)`
3. `await converter.init()`
4. Loop: `converter.tick()` while reading `converter.progress()` →
   emit `progress` events — until done.
5. `converter.getResult()` → SVG string → emit `done`.
6. **ALWAYS `converter.free()`** in a `finally` block (manual WASM memory
   cleanup), including on error/cancel.

### WASM serving (static export)

The `.wasm` is copied to `/public/wasm/` and the worker initializes it from a
relative URL. Predictable, CDN-cacheable, works on any static host. Copy is
wired via a `postinstall`/prebuild script or committed asset (verified during
scaffold).

## Settings → vtracer params

| UI control | vtracer param | Notes |
|---|---|---|
| Color precision | `color_precision` | |
| Filter speckle | `filter_speckle` | |
| Smoothing | `corner_threshold` + `path_precision` | |
| Curve mode | `mode` | spline / polygon |
| Layering | `hierarchical` | stacked / cutout |
| Color / B&W | converter class | Color vs Binary |

**Presets** are param bundles, applied then user-adjustable:
- **Logo / flat color** — low color_precision, higher filter_speckle, spline.
- **Sketch / line art** — Binary converter, polygon/spline tuned for lines.
- **Photo** — high color_precision, low filter_speckle.

Sensible defaults so most users never open the settings.

## Feature flow (4 steps)

`page.tsx` orchestrates and holds top-level state only (current step, the
working SVG string, the source image). Each step is a self-contained component.

1. **Upload** — drag & drop or file picker. Validate MIME **and magic bytes**
   (not extension), ≤10MB, max dimensions. Reject anything else with a clear
   message. Produces an `ImageData` for the worker.
2. **Vectorize** — runs the worker. Original vs SVG side-by-side. Settings
   panel + 3 presets. Real progress bar from `progress()`.
3. **Color editor** — extract unique fills → swatches. Click swatch → picker →
   replace all paths with that fill. Click a path in the preview → select +
   recolor just that one. Live preview.
4. **Path labeler** (the differentiator) — "Label Mode" toggle. Click path →
   input → save `data-label="wing"` AND `<title>wing</title>`. Sidebar lists
   labels; click a label → highlight its path. On export, prepend
   `<!-- SVGcraft labels: wing, beak, body -->`. Labels survive
   download + re-import.

## Security (untrusted input: uploaded SVGs + user text)

- **Never** render SVG via `dangerouslySetInnerHTML`/`innerHTML` on raw strings.
  Flow: `DOMParser` → `sanitize.ts` → mount the sanitized DOM node.
- `sanitize.ts` strips: `<script>`, `<foreignObject>`, event handlers (`on*`),
  `javascript:` URLs, external `href`/`xlink:href`, `<use>` pointing
  off-document.
- Color input validated against a strict hex/rgb regex before any DOM write.
- Label text: strip `< > & "` and cap length before writing attribute/title.
- `output: 'export'` → pure static files, no server attack surface.
- CSP meta tag: no inline scripts, no eval; allow `wasm-unsafe-eval` for the
  worker only.
- No telemetry, no analytics, no external network calls at runtime.

## Quality & accessibility

- TypeScript strict, **no `any`**.
- Every interactive element keyboard-navigable with ARIA labels.
- `ErrorBoundary` around the SVG canvas; user-friendly messages, never raw
  stack traces.
- Mobile responsive.
- Loading states for WASM init and vectorization.
- Comments only where logic is non-obvious (WASM init timing, sanitization
  rules).

## File structure (modular, ≤200 lines/file)

```
/app            layout.tsx, page.tsx, globals.css
/components
  /upload       ImageDropzone.tsx, UploadStep.tsx
  /vectorize    VectorizeSettings.tsx, SvgPreview.tsx, VectorizeStep.tsx
  /colors       ColorSwatches.tsx, ColorPicker.tsx, ColorEditStep.tsx
  /labels       LabelSidebar.tsx, LabelInput.tsx, LabelStep.tsx
  /shared       StepIndicator.tsx, ErrorBoundary.tsx, LoadingState.tsx,
                DownloadButton.tsx
/hooks          useVectorizer.ts, useSvgColors.ts, usePathLabels.ts,
                useSvgSelection.ts
/lib            svgParser.ts, colorUtils.ts, fileUtils.ts, labelUtils.ts,
                sanitize.ts
/workers        vectorizer.worker.ts
/types          svg.types.ts
```

## Open source

- MIT `LICENSE`.
- `README` — what it does, privacy note (all client-side), local dev setup,
  one-click Vercel deploy, contribution guide.
- `AGENTS.md` — architecture description.
- `.gitignore`, GitHub Actions CI: lint + typecheck + build.

## Build order (commit per module)

1. Scaffold: Next 16 + Tailwind v4 + TS strict + deps + CSP + WASM copy. Verify
   install + dev build.
2. `/types` + `/lib` (sanitize, svgParser, colorUtils, fileUtils, labelUtils)
   with unit tests.
3. `/workers/vectorizer.worker.ts` + `useVectorizer` (the adapter boundary).
   Verify WASM init in worker.
4. Upload step.
5. Vectorize step (settings, presets, preview, progress).
6. Color editor step.
7. Label step.
8. Shared chrome (StepIndicator, ErrorBoundary, LoadingState, DownloadButton),
   wire `page.tsx`.
9. OSS files + CI.

## Decisions locked with user

- Engine: `vectortracer@0.1.2`, fallback `imagetracerjs` only after asking.
- WASM: copy to `/public/wasm/`, fetch by URL.
- Git: `git init`, commit per module.
