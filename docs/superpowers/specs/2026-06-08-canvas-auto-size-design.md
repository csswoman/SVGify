# Canvas Auto-Size & Tight Zoom Fit

**Date:** 2026-06-08  
**Status:** Approved (pending user spec review)

## Summary

Replace the fixed large canvas frame (`min-h-[28rem]`, full panel width) and the default 80% zoom with a **content-aware canvas** that sizes itself from the SVG `viewBox`, clamped between sensible min/max bounds. Default zoom returns to **100%** so the artwork fills the computed canvas without extra letterboxing. Zoom out (25%) and zoom in (800%) remain available via **+/−** controls only; mouse wheel stays reserved for panel scroll.

## Problem

Two independent sources of excessive white space:

1. **Fixed canvas frame** — The viewport always occupies full panel width and at least 28rem height, so small icons float in a large empty box.
2. **Default 80% zoom** — Expanding the viewBox by 25% adds intentional padding around the drawing on every load.

Users expect the preview area to **adapt to the image size** while remaining usable for tiny icons and large photos.

## Goals

- Canvas dimensions derive from SVG intrinsic aspect ratio.
- Small images (e.g. 64×64) render at a readable minimum size (~200px on the shorter side).
- Large images scale down to fit the available panel (max width = panel, max height ≈ `min(70vh, 32rem)`).
- Default zoom is **100%** with centered fit — no artificial padding at load.
- Preserve existing pan (Space / Alt / middle mouse) when zoomed in above 100%.
- Preserve **+/−** zoom controls and reset-to-default; no wheel zoom.

## Non-goals

- Changing vectorization output or viewBox generation.
- 1:1 pixel display for large rasters (always scale down when exceeding max bounds).
- Zoom controls in the inspector panel (overlay controls stay as today).
- Persisting canvas size across sessions.

## User-visible behavior

| Case | Canvas size | Default zoom |
|------|-------------|--------------|
| Icon 64×64 | ~200×200 px | 100% |
| Logo 400×400 | ~400×400 px | 100% |
| Photo 3000×2000 | Scaled to fit panel (e.g. ~900×600) | 100% |
| User clicks **−** | Same canvas; viewBox zooms out to 25% min | — |
| User clicks **+** | Same canvas; viewBox zooms in to 800% max | — |
| User clicks **%** reset | 100%, centered | 100% |

The canvas block is **horizontally centered** in the scrollable workspace area with ~16px outer padding.

## Constants

```ts
MIN_CANVAS_PX = 200        // shorter side minimum
MAX_CANVAS_HEIGHT = min(70vh, 32rem)
MAX_CANVAS_WIDTH = 100% of panel content area
CANVAS_OUTER_PADDING = 16px
DEFAULT_ZOOM_SCALE = 1.0
MIN_ZOOM_SCALE = 0.25
MAX_ZOOM_SCALE = 8
```

## Architecture

### Pure sizing function

New file: `lib/canvasDisplaySize.ts`

```
computeCanvasDisplaySize(
  viewBox: { w: number; h: number },
  bounds: { maxWidth: number; maxHeight: number }
): { width: number; height: number }
```

Rules:

1. Guard: invalid or zero dimensions → `{ width: 200, height: 200 }`.
2. Compute scale = `min(maxWidth / w, maxHeight / h, 1)` — never upscale beyond intrinsic 100%.
3. Apply scale: `width = w * scale`, `height = h * scale`.
4. If `min(width, height) < MIN_CANVAS_PX`, scale up uniformly so the shorter side equals `MIN_CANVAS_PX` (may exceed max bounds slightly for tiny icons — acceptable trade-off for legibility).

### React hook

New file: `hooks/useCanvasDisplaySize.ts`

- Inputs: `svgEl: SVGElement | null`, `wrapperRef: RefObject<HTMLElement | null>` (scroll/panel parent for max width).
- On mount / `svgEl` change: read viewBox via existing `readSvgViewBox`.
- `ResizeObserver` on wrapper: recompute `maxWidth` / `maxHeight` (subtract outer padding).
- Returns `{ width, height } | null` before first measurement.

### Zoom integration

- `types/svg.types.ts`: set `DEFAULT_ZOOM_SCALE = 1.0`.
- `hooks/useSvgZoom.ts`: no behavioral change beyond default scale; `isPanMode` when `scale > 1`; centered offset logic (already implemented) applies at 100%.
- `Workspace.tsx`: continues resetting to `DEFAULT_ZOOM_VIEWPORT` on new SVG.

### UI wiring

| File | Change |
|------|--------|
| `components/workspace/Canvas.tsx` | Remove `min-h-[28rem]`; use `useCanvasDisplaySize`; center canvas wrapper |
| `components/shared/ZoomableSvgViewport.tsx` | Accept optional `displaySize`; apply inline `width`/`height` on container |
| `hooks/useWorkspaceSvg.ts` | SVG styles remain `width/height: 100%` of container |
| `lib/i18n.tsx` | Confirm pan hint does not reference wheel zoom |

### Data flow

```
svgString loaded
  → mountSvg → readSvgViewBox
  → useCanvasDisplaySize → { width, height }
  → ZoomableSvgViewport container sized exactly
  → useSvgZoom attach at scale 1.0, centered offset
  → artwork fills canvas, no letterboxing at default
```

## Edge cases

| Case | Handling |
|------|----------|
| Missing viewBox | Infer from width/height attrs (existing mount logic); fallback 200×200 |
| viewBox w or h = 0 | Fallback 200×200 |
| Panel resize | ResizeObserver recalculates; large images shrink/grow within max |
| Undo/redo remounts SVG | Re-read viewBox; recalculate if dimensions differ |
| Zoom out below 100% | Allowed via **−**; centered offset shows padding inside fixed canvas (intentional) |

## Testing

### Unit tests (`lib/canvasDisplaySize.test.ts`)

- 64×64 icon → 200×200 (min clamp)
- 400×400 logo → 400×400 (natural size within bounds)
- 3000×2000 with max 900×600 bounds → 900×600 (scale down)
- Wide panorama (2000×500) → fits max width, height proportional
- Zero viewBox → 200×200 fallback

### Regression

- Existing `svgViewBox.test.ts` helpers unchanged
- Update any test asserting `DEFAULT_ZOOM_SCALE === 0.8` to `1.0`

### Manual QA

1. Upload small icon — canvas ~200px, no large gray frame
2. Upload square logo — canvas matches proportions
3. Upload large photo — scales to panel, no overflow
4. Resize browser window — canvas adapts
5. Zoom **+/−** and reset — works; wheel scrolls panel, not zoom

## Out of scope / deferred

- Separate sizing for vectorize preview step (ImagePreview / SvgPreview split view)
- Animated canvas resize transitions
- User preference for min/max canvas constants
