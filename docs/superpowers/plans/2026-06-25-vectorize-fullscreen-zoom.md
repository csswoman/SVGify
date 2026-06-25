# Vectorize Fullscreen Zoom/Pan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable vectorize view with a fullscreen panel that fills the available height, supports mouse-wheel zoom and drag pan, and lets the user toggle between SVG result and original image in the same viewport.

**Architecture:** `useSvgZoom` gains wheel-zoom support via a `useEffect` that attaches a non-passive wheel listener to the viewport container. `SvgPreview` exposes the mounted `SVGSVGElement` via an `onSvgMount` callback so the zoom hook can attach. The vectorize section in `Canvas.tsx` is refactored to a fill-height flex layout; `ZoomableSvgViewport` hosts the SVG, and `ImagePreview` renders as an absolute overlay when the toggle is active.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing `useSvgZoom` / `ZoomableSvgViewport` hooks and components.

---

## File Map

| File | Action |
|------|--------|
| `hooks/useSvgZoom.ts` | Add wheel-zoom: `useEffect` attaching `wheel` listener to container div |
| `components/vectorize/SvgPreview.tsx` | Add `onSvgMount?: (svg: SVGSVGElement) => void` prop, call after imperative mount |
| `components/vectorize/ImagePreview.tsx` | Add optional `zoomTransform?: string` + pointer/wheel props for overlay pan/zoom |
| `hooks/useImageZoom.ts` | New hook: CSS transform-based zoom+pan for the image overlay |
| `components/workspace/Canvas.tsx` | Refactor vectorize section: fullscreen layout, `useSvgZoom` instance, overlay toggle |

---

### Task 1: Add wheel-zoom to `useSvgZoom`

**Files:**
- Modify: `hooks/useSvgZoom.ts`

`useSvgZoom` currently has no wheel handler. We need to attach a non-passive wheel listener to the same div that `ZoomableSvgViewport` renders into (the one that receives `onPointerDown` etc.). The hook will accept an optional `containerRef` and attach/detach the listener on mount.

- [ ] **Step 1: Add `containerRef` param and wheel effect to `useSvgZoom`**

In `hooks/useSvgZoom.ts`, add the `containerRef` option and a `useEffect` that attaches a `wheel` listener. Insert after the existing space-key `useEffect` (around line 68):

```typescript
// Add to UseSvgZoomOptions interface (around line 22):
interface UseSvgZoomOptions {
  viewport?: SvgZoomViewport;
  onViewportChange?: (viewport: SvgZoomViewport) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

// Add after the space-key useEffect (after line 68):
useEffect(() => {
  const el = options.containerRef?.current;
  if (!el) return;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(scaleRef.current * factor);
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}, [options.containerRef, setZoom]);
```

> **Note:** `setZoom` is defined below this point in the file — move the `useEffect` to after `setZoom` is defined (around line 130), or extract `setZoom` above. The simplest fix: place this `useEffect` at the end of the hook body, before the `return` statement.

- [ ] **Step 2: Wire `containerRef` in `ZoomableSvgViewport`**

`ZoomableSvgViewport` already receives `containerRef` (the div ref). Pass it to `useSvgZoom` from wherever the hook is called. Since the hook is called externally (in `useWorkspaceSvg` or `Canvas`), the caller must pass `containerRef` to `useSvgZoom`.

No change needed in `ZoomableSvgViewport.tsx` itself — the ref is already there.

- [ ] **Step 3: Verify no regressions in editor zoom**

The editor's `useSvgZoom` call is in `useWorkspaceSvg.ts` line 35:
```typescript
const zoom = useSvgZoom({ viewport: zoomViewport, onViewportChange: onZoomViewportChange });
```
Since `containerRef` is optional and defaults to undefined, this call is unaffected. No change needed in `useWorkspaceSvg.ts`.

- [ ] **Step 4: Commit**

```bash
git add hooks/useSvgZoom.ts
git commit -m "feat: add wheel-zoom support to useSvgZoom"
```

---

### Task 2: Expose mounted SVG from `SvgPreview`

**Files:**
- Modify: `components/vectorize/SvgPreview.tsx`

After imperative mount, `useSvgZoom.attach()` needs the `SVGSVGElement`. We add an `onSvgMount` callback prop.

- [ ] **Step 1: Add `onSvgMount` prop and call it after mount**

In `SvgPreview.tsx`, update the `SvgPreviewProps` interface and the `useEffect`:

```typescript
// Update interface (line 8):
interface SvgPreviewProps {
  svgString: string | null;
  displaySize?: CanvasDisplaySize | null;
  onPathClick?: (pathEl: SVGPathElement) => void;
  onSvgMount?: (svg: SVGSVGElement | null) => void;
}

// Update SvgPreviewInner signature to destructure onSvgMount:
function SvgPreviewInner({ svgString, displaySize, onPathClick, onSvgMount }: SvgPreviewProps) {
```

At the end of the `try` block in the `useEffect`, after `mount.replaceChildren(svg)` (around line 61):
```typescript
mount.replaceChildren(svg);
onSvgMount?.(svg as unknown as SVGSVGElement);
```

In the early-return branch (when `!svgString`), after `mount.replaceChildren()`:
```typescript
mount.replaceChildren();
onSvgMount?.(null);
```

- [ ] **Step 2: Add `onSvgMount` to the dependency array**

```typescript
}, [svgString, onPathClick, onSvgMount]);
```

- [ ] **Step 3: Commit**

```bash
git add components/vectorize/SvgPreview.tsx
git commit -m "feat: expose mounted SVGSVGElement via onSvgMount callback in SvgPreview"
```

---

### Task 3: New `useImageZoom` hook for CSS-transform pan/zoom

**Files:**
- Create: `hooks/useImageZoom.ts`

The image overlay uses CSS `transform` (not SVG viewBox) for zoom/pan, keeping it simple and independent of `useSvgZoom`.

- [ ] **Step 1: Create `hooks/useImageZoom.ts`**

```typescript
'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface ImageZoom {
  transform: string;
  scale: number;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  reset: () => void;
}

export function useImageZoom(): ImageZoom {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const next = Math.min(10, Math.max(0.1, scaleRef.current * factor));
    scaleRef.current = next;
    setScale(next);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { active: true, x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    panRef.current = { active: true, x: e.clientX, y: e.clientY };
    const next = { x: offsetRef.current.x + dx, y: offsetRef.current.y + dy };
    offsetRef.current = next;
    setOffset({ ...next });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    panRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const reset = useCallback(() => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;

  return { transform, scale, onPointerDown, onPointerMove, onPointerUp, onWheel, reset };
}
```

> **Note:** `onWheel` is a React synthetic event handler (not a native listener), so no need for `passive: false` hacks. Pass it directly to the overlay div's `onWheel` prop in `ImagePreview`.

- [ ] **Step 2: Commit**

```bash
git add hooks/useImageZoom.ts
git commit -m "feat: add useImageZoom hook for CSS-transform pan/zoom"
```

---

### Task 4: Add zoom/pan support to `ImagePreview`

**Files:**
- Modify: `components/vectorize/ImagePreview.tsx`

When used as an overlay, `ImagePreview` needs to accept zoom/pan interaction props and apply a CSS transform to its canvas.

- [ ] **Step 1: Update `ImagePreviewProps` and apply transform**

Replace the full content of `components/vectorize/ImagePreview.tsx`:

```typescript
'use client';

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { SeedPoint } from '@/lib/backgroundRemoval';
import type { CanvasDisplaySize } from '@/lib/canvasDisplaySize';

interface ImagePreviewProps {
  imageData: ImageData;
  label?: string;
  displaySize?: CanvasDisplaySize | null;
  onPick?: (point: SeedPoint) => void;
  seeds?: SeedPoint[];
  // Overlay zoom/pan props (optional — only used in overlay mode)
  zoomTransform?: string;
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
}

export function ImagePreview({
  imageData,
  label = 'Original',
  displaySize,
  onPick,
  seeds,
  zoomTransform,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
}: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    if (seeds && seeds.length > 0) {
      const radius = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) * 0.012));
      for (const s of seeds) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
        ctx.fill();
        ctx.lineWidth = Math.max(2, radius / 3);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    }
  }, [imageData, seeds]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    onPick({ x, y });
  };

  const isOverlay = zoomTransform !== undefined;

  if (isOverlay) {
    return (
      <div
        className="absolute inset-0 overflow-hidden cursor-grab touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ transform: zoomTransform, transformOrigin: 'center center' }}
        >
          <canvas
            ref={canvasRef}
            className="block max-w-full max-h-full"
            aria-label={label}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</p>
      <div
        className="mx-auto w-fit max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700"
        style={displaySize ? { width: displaySize.width, height: displaySize.height } : undefined}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className={`block h-full w-full${onPick ? ' cursor-crosshair' : ''}`}
          aria-label={onPick ? `${label} — click the background to remove it` : label}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/vectorize/ImagePreview.tsx
git commit -m "feat: add overlay zoom/pan props to ImagePreview"
```

---

### Task 5: Refactor vectorize section in `Canvas.tsx`

**Files:**
- Modify: `components/workspace/Canvas.tsx`

This is the main integration task. The vectorize section becomes a fullscreen flex layout using `ZoomableSvgViewport` with `useSvgZoom` and an image overlay toggle.

- [ ] **Step 1: Add imports**

At the top of `Canvas.tsx`, add:
```typescript
import { useSvgZoom } from '@/hooks/useSvgZoom';
import { useImageZoom } from '@/hooks/useImageZoom';
import { useRef } from 'react'; // already imported, just confirm
```

Remove the import of `useVectorizePreviewSizes` (no longer needed in vectorize view).

- [ ] **Step 2: Add zoom hooks inside the Canvas component**

After line 87 (after `const { replaceColor } = useSvgZoom(...)`), add:

```typescript
const vectorizeContainerRef = useRef<HTMLDivElement>(null);
const vectorizeZoom = useSvgZoom({ containerRef: vectorizeContainerRef });
const imageZoom = useImageZoom();

const handleVectorizeSvgMount = useCallback(
  (svg: SVGSVGElement | null) => {
    if (svg) vectorizeZoom.attach(svg);
  },
  [vectorizeZoom.attach]
);
```

Remove the `vectorizePreviewSizes` call:
```typescript
// DELETE this block:
const vectorizePreviewSizes = useVectorizePreviewSizes({
  panelRef: vectorizePanelRef,
  imageData: isVectorizeView ? vectorizeSession.processedImageData : null,
  svgString: isVectorizeView ? vectorizeSession.svg : null,
  twoColumns: showOriginalPreview,
});
```

Also remove `vectorizePanelRef` (no longer needed) and `showOriginalPreview` state can be kept for the toggle.

- [ ] **Step 3: Replace the vectorize JSX section**

Find the `{isVectorizeView && ( ... )}` block (lines 171–217) and replace it entirely:

```tsx
{isVectorizeView && (
  <>
    {error && (
      <div
        role="alert"
        className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
      >
        {error}
      </div>
    )}
    {processedImageData && (
      <div className="flex flex-col h-full gap-2">
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {t('vec.vector')}
            {svg && (
              <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                ({formatBytes(svgByteSize(svg))})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              type="button"
              onClick={() => showOriginalPreview ? imageZoom.reset() : vectorizeZoom.reset()}
              className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Reset zoom"
            >
              {Math.round((showOriginalPreview ? 1 : vectorizeZoom.scale) * 100)}%
            </button>
            <button
              type="button"
              onClick={() => showOriginalPreview ? undefined : vectorizeZoom.zoomIn()}
              className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => showOriginalPreview ? undefined : vectorizeZoom.zoomOut()}
              className="focus-ring rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setShowOriginalPreview((v) => !v)}
              className="focus-ring rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-expanded={showOriginalPreview}
            >
              {showOriginalPreview ? t('vec.hideOriginal') : t('vec.showOriginal')}
            </button>
          </div>
        </div>

        {/* Viewport: fills remaining height */}
        <div className="relative flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transparent-preview">
          {/* SVG layer — always mounted, hidden when showing original */}
          <div
            ref={vectorizeContainerRef}
            className="w-full h-full"
            style={{ visibility: showOriginalPreview ? 'hidden' : 'visible' }}
            onPointerDown={vectorizeZoom.onPointerDown}
            onPointerMove={vectorizeZoom.onPointerMove}
            onPointerUp={vectorizeZoom.onPointerUp}
            onPointerCancel={vectorizeZoom.onPointerUp}
          >
            <SvgPreview svgString={svg} onSvgMount={handleVectorizeSvgMount} />
          </div>

          {/* Image overlay — absolute, shown only when toggle is on */}
          {showOriginalPreview && (
            <ImagePreview
              imageData={processedImageData}
              label={removeBg ? t('vec.originalPick') : t('vec.original')}
              onPick={removeBg ? handlePick : undefined}
              seeds={removeBg ? seeds : undefined}
              zoomTransform={imageZoom.transform}
              onPointerDown={imageZoom.onPointerDown}
              onPointerMove={imageZoom.onPointerMove}
              onPointerUp={imageZoom.onPointerUp}
              onWheel={imageZoom.onWheel}
            />
          )}
        </div>
      </div>
    )}
  </>
)}
```

- [ ] **Step 4: Update the outer section element**

The outer `<section>` for the vectorize view needs `h-full` and `flex flex-col`. Find the `<section ref={isVectorizeView ? vectorizePanelRef : canvasPanelRef}` (line 167) and update:

```tsx
<section
  ref={canvasPanelRef}
  aria-label={t('workspace.canvas')}
  className="relative min-w-0 flex-1 overflow-hidden bg-gray-200/60 p-4 flex flex-col dark:bg-gray-950/60"
>
```

Note: `overflow-y-auto` → `overflow-hidden` (the inner flex handles scroll), remove the vectorize panel ref (no longer needed), add `flex flex-col`.

- [ ] **Step 5: Remove unused refs and imports**

Remove `vectorizePanelRef` (ref and usage), remove `useVectorizePreviewSizes` import.

- [ ] **Step 6: Commit**

```bash
git add components/workspace/Canvas.tsx
git commit -m "feat: refactor vectorize view to fullscreen layout with zoom/pan and image overlay toggle"
```

---

### Task 6: Wire `containerRef` in `useSvgZoom` for wheel events

**Files:**
- Modify: `hooks/useSvgZoom.ts`

> **Note:** In Task 1 we added the wheel `useEffect` but `useSvgZoom` doesn't currently receive a `containerRef`. In Task 5, `Canvas.tsx` passes `vectorizeContainerRef` to `useSvgZoom`. This task verifies the wiring is correct end-to-end.

- [ ] **Step 1: Verify `useSvgZoom` options type includes `containerRef`**

Confirm `hooks/useSvgZoom.ts` has:
```typescript
interface UseSvgZoomOptions {
  viewport?: SvgZoomViewport;
  onViewportChange?: (viewport: SvgZoomViewport) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}
```

And at the end of the hook body (before `return`):
```typescript
useEffect(() => {
  const el = options.containerRef?.current;
  if (!el) return;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(scaleRef.current * factor);
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}, [options.containerRef, setZoom]);
```

- [ ] **Step 2: Add `import type { RefObject } from 'react'` if not present**

Check line 1 of `hooks/useSvgZoom.ts` — it imports from `react` already. Add `RefObject` to the import if missing:
```typescript
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
```

Wait — `RefObject` is not used directly in the hook body (it's in the options type). Use:
```typescript
import type { RefObject } from 'react';
```
Or inline it as `React.RefObject`. Use whichever pattern the file already uses.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add hooks/useSvgZoom.ts
git commit -m "fix: ensure useSvgZoom containerRef type is correct for wheel zoom"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Upload an image and vectorize**

Upload any PNG/JPG. The app switches to vectorize view automatically. Verify:
- SVG fills the panel height (no more vertical scroll)
- Mouse wheel zooms in/out on the SVG
- Space+drag or middle-click pans the SVG

- [ ] **Step 3: Test the toggle**

Click "Show original". Verify:
- Image appears overlaid in the same viewport (not below)
- Mouse wheel zooms the image
- Drag pans the image
- SVG is hidden (not visible underneath)

Click "Hide original". Verify:
- SVG reappears with zoom state preserved (not reset)

- [ ] **Step 4: Test the zoom buttons**

Click +/− buttons. Verify zoom changes. Click the percentage label to reset to 100%.

- [ ] **Step 5: Verify editor view unaffected**

Switch to editor (select tool). Verify the SVG editor still works normally — pan, zoom, node editing all functional.

- [ ] **Step 6: Commit if any visual fixes needed**

```bash
git add -p
git commit -m "fix: vectorize fullscreen layout visual adjustments"
```
