# Canvas Auto-Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed full-width canvas and default 80% zoom with a viewBox-driven canvas that sizes to the SVG (min 200px, max panel bounds) and loads at 100% zoom with no extra letterboxing.

**Architecture:** Pure sizing logic in `lib/canvasDisplaySize.ts` (unit tested). A `useCanvasDisplaySize` hook observes the scroll panel via `ResizeObserver` and returns pixel dimensions. `Canvas.tsx` passes those dimensions to `ZoomableSvgViewport`, which drops `min-h-[28rem]` and `w-full`. Default zoom constant moves from `0.8` to `1.0`.

**Tech Stack:** Next.js App Router, React 19, Vitest, existing `useSvgZoom` / `readSvgViewBox` helpers.

**Spec:** `docs/superpowers/specs/2026-06-08-canvas-auto-size-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/canvasDisplaySize.ts` | Pure `computeCanvasDisplaySize` + exported constants |
| `lib/canvasDisplaySize.test.ts` | Unit tests for sizing rules |
| `hooks/useCanvasDisplaySize.ts` | ResizeObserver + viewBox → `{ width, height }` |
| `types/svg.types.ts` | `DEFAULT_ZOOM_SCALE = 1.0` |
| `hooks/useSvgZoom.ts` | `isPanMode` when `scale > 1` (explicit, not tied to default) |
| `components/shared/ZoomableSvgViewport.tsx` | Accept `displaySize`, apply inline dimensions |
| `components/workspace/Canvas.tsx` | Hook wiring, centered wrapper, remove fixed min-height |
| `lib/i18n.tsx` | Confirm pan hint has no wheel reference |

---

### Task 1: Pure canvas sizing function (TDD)

**Files:**
- Create: `lib/canvasDisplaySize.ts`
- Create: `lib/canvasDisplaySize.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/canvasDisplaySize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeCanvasDisplaySize, MIN_CANVAS_PX } from './canvasDisplaySize';

describe('computeCanvasDisplaySize', () => {
  const bounds = { maxWidth: 900, maxHeight: 600 };

  it('scales tiny icons up to the minimum canvas size', () => {
    expect(computeCanvasDisplaySize({ w: 64, h: 64 }, bounds)).toEqual({
      width: MIN_CANVAS_PX,
      height: MIN_CANVAS_PX,
    });
  });

  it('keeps natural size when within bounds', () => {
    expect(computeCanvasDisplaySize({ w: 400, h: 400 }, bounds)).toEqual({
      width: 400,
      height: 400,
    });
  });

  it('scales large images down to fit max bounds', () => {
    expect(computeCanvasDisplaySize({ w: 3000, h: 2000 }, bounds)).toEqual({
      width: 900,
      height: 600,
    });
  });

  it('preserves aspect ratio for wide panoramas', () => {
    expect(computeCanvasDisplaySize({ w: 2000, h: 500 }, bounds)).toEqual({
      width: 900,
      height: 225,
    });
  });

  it('falls back when viewBox dimensions are invalid', () => {
    expect(computeCanvasDisplaySize({ w: 0, h: 100 }, bounds)).toEqual({
      width: MIN_CANVAS_PX,
      height: MIN_CANVAS_PX,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/canvasDisplaySize.test.ts
```

Expected: FAIL — module `./canvasDisplaySize` not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/canvasDisplaySize.ts`:

```ts
export const MIN_CANVAS_PX = 200;

export interface CanvasViewBoxSize {
  w: number;
  h: number;
}

export interface CanvasDisplayBounds {
  maxWidth: number;
  maxHeight: number;
}

export interface CanvasDisplaySize {
  width: number;
  height: number;
}

function fallbackSize(): CanvasDisplaySize {
  return { width: MIN_CANVAS_PX, height: MIN_CANVAS_PX };
}

export function computeCanvasDisplaySize(
  viewBox: CanvasViewBoxSize,
  bounds: CanvasDisplayBounds
): CanvasDisplaySize {
  const { w, h } = viewBox;
  const { maxWidth, maxHeight } = bounds;

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return fallbackSize();
  }
  if (!Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || maxWidth <= 0 || maxHeight <= 0) {
    return fallbackSize();
  }

  const fitScale = Math.min(maxWidth / w, maxHeight / h, 1);
  let width = w * fitScale;
  let height = h * fitScale;

  const shorter = Math.min(width, height);
  if (shorter < MIN_CANVAS_PX) {
    const bump = MIN_CANVAS_PX / shorter;
    width *= bump;
    height *= bump;
  }

  return { width: Math.round(width), height: Math.round(height) };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/canvasDisplaySize.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/canvasDisplaySize.ts lib/canvasDisplaySize.test.ts
git commit -m "feat: add viewBox-driven canvas display size helper"
```

---

### Task 2: ResizeObserver hook

**Files:**
- Create: `hooks/useCanvasDisplaySize.ts`

- [ ] **Step 1: Create the hook**

Create `hooks/useCanvasDisplaySize.ts`:

```ts
'use client';

import { useEffect, useState, type RefObject } from 'react';
import {
  computeCanvasDisplaySize,
  type CanvasDisplaySize,
} from '@/lib/canvasDisplaySize';
import { readSvgViewBox } from '@/lib/svgViewBox';

/** Matches Canvas section padding (p-4 = 16px per side). */
export const CANVAS_PANEL_PADDING_PX = 16;

/** Tailwind 32rem at default root font size. */
export const MAX_CANVAS_HEIGHT_PX = 512;

interface UseCanvasDisplaySizeOptions {
  svgEl: SVGElement | null;
  panelRef: RefObject<HTMLElement | null>;
}

export function useCanvasDisplaySize({ svgEl, panelRef }: UseCanvasDisplaySizeOptions) {
  const [displaySize, setDisplaySize] = useState<CanvasDisplaySize | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !svgEl) {
      setDisplaySize(null);
      return;
    }

    const recompute = () => {
      const panelWidth = panel.clientWidth - CANVAS_PANEL_PADDING_PX * 2;
      const maxHeight = Math.min(
        Math.round(window.innerHeight * 0.7),
        MAX_CANVAS_HEIGHT_PX
      );
      const viewBox = readSvgViewBox(svgEl as SVGSVGElement);
      setDisplaySize(
        computeCanvasDisplaySize(
          { w: viewBox.w, h: viewBox.h },
          { maxWidth: Math.max(1, panelWidth), maxHeight: Math.max(1, maxHeight) }
        )
      );
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(panel);
    window.addEventListener('resize', recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [svgEl, panelRef]);

  return displaySize;
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useCanvasDisplaySize.ts
git commit -m "feat: add hook to size canvas from SVG viewBox and panel bounds"
```

---

### Task 3: Default zoom back to 100%

**Files:**
- Modify: `types/svg.types.ts`
- Modify: `hooks/useSvgZoom.ts`

- [ ] **Step 1: Update default zoom constant**

In `types/svg.types.ts`, change:

```ts
export const DEFAULT_ZOOM_SCALE = 1.0;
```

- [ ] **Step 2: Make pan mode explicit at >100%**

In `hooks/useSvgZoom.ts`, change the return value:

```ts
isPanMode: scale > 1,
```

(remove dependency on `DEFAULT_ZOOM_SCALE` for pan detection — pan only when actually zoomed in)

- [ ] **Step 3: Run existing tests**

```bash
npm test -- --run
```

Expected: all tests PASS (no test currently asserts `0.8`).

- [ ] **Step 4: Commit**

```bash
git add types/svg.types.ts hooks/useSvgZoom.ts
git commit -m "fix: restore 100% default zoom for tight canvas fit"
```

---

### Task 4: Wire canvas UI

**Files:**
- Modify: `components/shared/ZoomableSvgViewport.tsx`
- Modify: `components/workspace/Canvas.tsx`

- [ ] **Step 1: Accept display size in viewport**

In `components/shared/ZoomableSvgViewport.tsx`:

1. Import `CanvasDisplaySize` from `@/lib/canvasDisplaySize`.
2. Add optional prop `displaySize?: CanvasDisplaySize | null`.
3. Wrap the outer `relative` div with `className="mx-auto w-fit"`.
4. On the inner container div, merge styles:

```tsx
style={{
  touchAction: 'none',
  cursor: zoom.isPanMode ? 'grab' : undefined,
  ...(displaySize
    ? { width: displaySize.width, height: displaySize.height }
    : undefined),
  ...style,
}}
```

5. Remove `w-full` from any className passed by parent (see Step 2).

- [ ] **Step 2: Use hook in Canvas**

In `components/workspace/Canvas.tsx`:

1. Add imports:

```tsx
import { useRef } from 'react';
import { useCanvasDisplaySize } from '@/hooks/useCanvasDisplaySize';
```

2. Inside the component (before early returns that don't need it, or only in the SVG edit branch), add:

```tsx
const canvasPanelRef = useRef<HTMLElement>(null);
```

3. In the SVG edit return block (where `ZoomableSvgViewport` renders), before the return:

```tsx
const displaySize = useCanvasDisplaySize({
  svgEl: editor?.svgEl ?? null,
  panelRef: canvasPanelRef,
});
```

Note: if hooks rules require consistent call order, declare `canvasPanelRef` at top of component and call `useCanvasDisplaySize` with `svgEl: editor?.svgEl ?? null` only when `editor` exists — pass `null` svgEl otherwise (hook already no-ops).

4. Attach ref to the `<section>`:

```tsx
<section ref={canvasPanelRef} ...>
```

5. Pass prop and update className on `ZoomableSvgViewport`:

```tsx
<ZoomableSvgViewport
  containerRef={containerRef}
  zoom={zoom}
  displaySize={displaySize}
  onClick={handleSvgClick}
  className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${
    useTransparent ? 'transparent-preview' : ''
  }`}
  ...
/>
```

Removed: `min-h-[28rem]`, `w-full`.

- [ ] **Step 3: Verify pan hint text**

In `lib/i18n.tsx`, confirm `zoom.panHint` does **not** mention wheel/rueda. Current copy should reference **+/−** only. Update if still stale.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: PASS.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Checklist:
1. Upload small icon → canvas ~200×200, centered, no huge gray frame
2. Upload large image → canvas scales down, no horizontal overflow
3. Resize browser → canvas adapts
4. **+/−** zoom works; mouse wheel scrolls panel
5. Status bar zoom shows 100% on load

- [ ] **Step 6: Commit**

```bash
git add components/shared/ZoomableSvgViewport.tsx components/workspace/Canvas.tsx lib/i18n.tsx
git commit -m "feat: auto-size workspace canvas to SVG viewBox"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Pure sizing function with min/max rules | Task 1 |
| ResizeObserver hook | Task 2 |
| `DEFAULT_ZOOM_SCALE = 1.0` | Task 3 |
| Remove `min-h-[28rem]`, centered canvas | Task 4 |
| Zoom **+/−** unchanged | Task 3–4 (no wheel handler added) |
| Pan when zoom > 100% | Task 3 (`isPanMode: scale > 1`) |
| Unit tests for sizing | Task 1 |
| i18n pan hint | Task 4 Step 3 |

## Deferred (per spec)

- Vectorize split preview sizing (`ImagePreview` / `SvgPreview`)
- Animated resize transitions
- User-configurable min/max constants
