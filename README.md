# SVGcraft

A free, open-source, **browser-only** SVG vectorizer web app. Convert raster images (PNG/JPG/WEBP) to vector SVGs, edit colors per-path, and label individual shapes.

**Everything runs client-side** — no backend, no API, no auth. Your uploaded images and SVGs never leave your device. This is both a privacy guarantee and a security feature.

## Features

- **Vectorize** — drag & drop images, adjust color/smoothing settings, preview instantly
- **Edit colors** — click any path to recolor it, or recolor by palette swatch
- **Label shapes** — name individual paths (e.g., "wing", "beak") — labels survive export and re-import
- **Static hosting** — zero backend required; deploy anywhere (Vercel, GitHub Pages, etc.)

## Tech Stack

- **Next.js 16** (App Router, TypeScript, static export)
- **React 19**
- **Tailwind CSS v4**
- **imagetracerjs** (pure JS color vectorization)

## Engine Decision

We evaluated `vectortracer` (Rust→WASM bindings) for better performance, but its `ColorImageConverter` is not yet implemented. Since **color editing is core to SVGcraft**, we use **imagetracerjs** for proven color tracing and per-path fill attributes. It's pure JavaScript, runs entirely in a Web Worker, and produces the SVG structure we need.

## Getting Started

```bash
git clone <repo>
cd svg-tool
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

```bash
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Project Structure

```
/app              Page layout and orchestration
/components       UI step components (upload, vectorize, colors, labels)
/hooks            Reusable logic (worker, SVG parsing, colors, labels)
/lib              Utilities (sanitization, file validation, parsing)
/workers          Web Worker for vectorization
/types            TypeScript types
/public           Static assets
```

## Security

- **All client-side** — uploaded images never touch a server
- **No external requests** — no analytics, no telemetry, no third-party APIs at runtime
- **Sanitized SVG output** — all user input is validated; SVGs are parsed and sanitized before rendering
- **Content Security Policy** — meta tag prevents inline scripts and eval

## Contributing

SVGcraft is MIT-licensed. Contributions welcome! Please:

1. Fork and create a feature branch
2. Follow the modular structure (max 200 lines/file)
3. Keep TypeScript strict (`no-any`)
4. Test your changes locally
5. Submit a PR

## License

MIT. See [LICENSE](LICENSE) for details.
