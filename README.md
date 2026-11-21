# SVGify

[![CI](https://github.com/csswoman/SVGify/actions/workflows/ci.yml/badge.svg)](https://github.com/csswoman/SVGify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Turn raster images (PNG, JPG, WEBP) into clean, editable SVGs, then recolor, reshape and export them without leaving the page.

**[Live demo → svg-ify.vercel.app](https://svg-ify.vercel.app/)**

## Features

- **Vectorize** with two profiles: *Icon* (flat logos, polygon-faithful edges) and *Standard* (artwork, spline fitting). Previews update live as you tweak settings.
- **Palette control**: automatic palette suggestion, merge similar colors, edit or add swatches before tracing.
- **Background removal**: topology-aware flood fill with seed picking, so enclosed shapes that match the background survive.
- **Edit the result**: recolor fills, move nodes, paint with a brush, erase regions or whole paths, label shapes. Undo included.
- **Export**: SVGO-optimized output with size feedback.
- **Bilingual UI** (English / Spanish), light and dark themes, keyboard shortcuts, WCAG 2.1 AA as the target.

## How it works

```
Browser                                         Server (Next.js route)
──────────────────────────────────────────      ─────────────────────────────
Upload → background removal → palette
suggestion
        │
Web Worker: quantize to palette, gzip RGBA
        │  compressed payload
        └────────────────────────────────────▶  POST /api/vectorize
                                                VTracer (@neplex/vectorizer)
                                                → palette snap, SVGO,
                                                  logo detail regularization
        ┌────────────────────────────────────◀  SVG
        ▼
Editable SVG in the DOM → fill / node / brush /
erase / label tools → SVGO → download
```

- Quantization and compression run off the main thread in a Web Worker. Requests are debounced (400 ms) and aborted when settings change, so slider drags don't pile up work.
- Tracing runs server-side with a native VTracer binding. That means **the app needs a Node.js runtime** (Vercel or `npm start`); it won't work on static hosting.
- Payload limits: 8,192 px per side and 16 MP in total. See [docs/vectorize-processing-contract.md](docs/vectorize-processing-contract.md).

## Getting started

Requires Node.js 22+.

```bash
git clone https://github.com/csswoman/SVGify.git
cd SVGify
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript, no emit |

CI runs lint, type-check, tests and a production build on every push and PR.

## Project structure

```
app/          Next.js App Router: page, metadata, /api/vectorize route
components/   Workspace UI: canvas, toolbar, inspectors, editors
hooks/        Workspace state: vectorize session, selection, shape tools, shortcuts
lib/          Image and SVG processing (pure functions, unit tested)
workers/      Vectorizer Web Worker
docs/         Processing contract, QA checklist, profile baselines
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · VTracer via `@neplex/vectorizer` · SVGO · Vitest

## License

MIT. See [LICENSE](LICENSE).
