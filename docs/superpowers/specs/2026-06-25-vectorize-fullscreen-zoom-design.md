# Vectorize View: Fullscreen + Zoom/Pan + Toggle

Date: 2026-06-25

## Goal

Replace the scrollable vertical layout in the vectorize view with a fullscreen panel that fills the available height, supports zoom (wheel) and pan (space+drag or middle-click), and lets the user toggle between the SVG result and the original image in the same viewport.

## Layout

The vectorize section becomes a flex column that fills the panel height. A fixed header bar contains the SVG label, file size, and the "Show original" toggle button. The preview fills all remaining space below the header.

Before (current):
- Vertical scroll, SVG preview at fixed computed size, image below

After:
- `flex flex-col h-full` container
- Header bar: label + file size + toggle button + zoom controls (+/−/reset)
- Preview area: `flex-1 relative overflow-hidden` — fills remaining height

## Zoom and Pan

`useSvgZoom` is instantiated in Canvas.tsx for the vectorize view (parallel to the existing editor zoom instance). `ZoomableSvgViewport` replaces `SvgPreview` as the host for the SVG.

- Zoom: mouse wheel (existing behavior in `useSvgZoom`)
- Pan: space+drag or middle-click (existing behavior in `useSvgZoom`)
- Zoom controls: +/− buttons and reset in the header bar

`SvgPreview` needs to expose the mounted `SVGSVGElement` via a callback ref so `useSvgZoom.attach()` can connect to it after imperative mount.

## Toggle SVG / Original Image

The "Show original" button already exists. New behavior:

- SVG stays mounted at all times (zoom state preserved)
- When showing original: canvas (`ImagePreview`) renders `position: absolute inset-0` over the viewport, SVG gets `visibility: hidden`
- When showing SVG: canvas is hidden, SVG gets `visibility: visible`

`ImagePreview` needs pan/zoom support when in overlay mode. Two options considered; chosen approach: add pointer event handlers + wheel handler to `ImagePreview` via optional props, using CSS `transform: scale() translate()` on the canvas element (simpler than adapting `useSvgZoom` which is SVG-viewBox-based).

## Files to Change

| File | Change |
|------|--------|
| `components/workspace/Canvas.tsx` | Refactor `isVectorizeView` section: new layout, instantiate `useSvgZoom` for vectorize, wire `ZoomableSvgViewport` |
| `components/vectorize/SvgPreview.tsx` | Add `onSvgMount?: (svg: SVGSVGElement) => void` prop; call it after imperative SVG mount |
| `components/vectorize/ImagePreview.tsx` | Add optional zoom/pan props (pointer handlers, wheel handler, transform state) for overlay mode |
| `hooks/useVectorizePreviewSizes.ts` | No longer used in vectorize view; leave file but stop calling it from Canvas in vectorize mode |

## Out of Scope

- Syncing zoom state between SVG and image overlay (they share the same visual space but use different zoom mechanisms)
- Saving zoom state to session/URL
- Vectorize palette preview (`PalettePreview`) — keep as-is below the viewport or remove from this view
