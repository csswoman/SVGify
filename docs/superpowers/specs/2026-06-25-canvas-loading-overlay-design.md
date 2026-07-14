# Canvas Loading Overlay Design

**Date:** 2026-06-25  
**Status:** Approved

## Overview

Add a non-blocking spinner overlay to the canvas panel that appears while the SVG is being processed — both during vectorization and during editor operations (color replace, erase, brush, node edits).

## Scope

Two loading states need visual feedback:

1. **Vectorize view** — `isLoading` from `useVectorizeSession` (already exists, just unused visually)
2. **Editor view** — new `isBusy` state in `useWorkspaceSvg` covering all `pushSnapshot` calls

## Component: `CanvasOverlay`

**File:** `components/shared/CanvasOverlay.tsx`

- Props: `isVisible: boolean`
- When `isVisible` is false, renders nothing
- When true: `position: absolute, inset: 0` overlay with semi-transparent background (`bg-white/40 dark:bg-gray-900/40 backdrop-blur-[1px]`) and an animated SVG spinner centered via flexbox
- Non-interactive — pointer events pass through conceptually (overlay is visual only, not blocking clicks)
- Parent container must have `position: relative` — both target containers already satisfy this

## Hook change: `useWorkspaceSvg`

**File:** `hooks/useWorkspaceSvg.ts`

- Add `isBusy: boolean` state, initialized to `false`
- Set to `true` at the start of `pushSnapshot`, `false` after the operation completes
- `pushSnapshot` is the single entry point for all editor mutations (color replace, erase, brush, nodes), so one change covers all cases
- Since `pushSnapshot` is synchronous, `isBusy` will be active for one render frame — enough to give feedback on large SVGs, zero cost on fast ones
- Expose `isBusy` in the hook's return value

## Integration: `Canvas.tsx`

**Vectorize view:**
```tsx
<div className="relative flex-1 overflow-hidden rounded-lg ...">
  <CanvasOverlay isVisible={isLoading} />
  {/* existing SVG/image viewport */}
</div>
```

**Editor view:**
Inside or adjacent to `ZoomableSvgViewport`, within a `relative` container:
```tsx
<div className="relative">
  <ZoomableSvgViewport ... />
  <CanvasOverlay isVisible={editor?.isBusy ?? false} />
</div>
```

## Out of scope

- No loading text or progress messages
- No blocking of user interaction (pointer events)
- No changes to sidebar, status bar, or other panels
