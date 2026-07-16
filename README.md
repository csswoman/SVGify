# SVGify

**SVGify** is a free, open-source web app that turns raster images (PNG, JPG, WEBP) into editable SVG files.

Upload an image, vectorize it, tweak colors and shapes, then download a clean SVG ready for icons, logos, or production use.

## What it does

1. **Vectorize** — Drag and drop a raster image, adjust color count and smoothing, and preview the SVG instantly.
2. **Edit colors** — Recolor individual paths or whole palette swatches.
3. **Shape tools** — Label paths, refine geometry, and clean up details before export.
4. **Export** — Download an optimized SVG you can use right away.

## Why SVGify

- **Editable by design** — Adjust colors, paths, labels, and export settings in one workspace.
- **Real-time preview** — See the result as you adjust settings.
- **Ship-ready output** — Aimed at designers, developers, and makers who need a usable SVG in one session.
- **Bilingual UI** — English and Spanish.

## Getting started

```bash
git clone <repo>
cd svg-tool
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech stack

- Next.js (App Router, TypeScript, static export)
- React 19 + Tailwind CSS v4
- imagetracerjs / vectorization in a Web Worker
- SVGO for optimized export

Deploy anywhere static hosting works (e.g. Vercel, GitHub Pages).

## License

MIT. See [LICENSE](LICENSE) for details.
