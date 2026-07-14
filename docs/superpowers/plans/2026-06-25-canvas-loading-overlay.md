# Canvas Loading Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a spinner overlay on the canvas while the SVG is being vectorized or while an editor operation (color replace, erase, brush, nodes) is being applied.

**Architecture:** A new `CanvasOverlay` component provides a `position: absolute` semi-transparent overlay with a centered spinner. `useWorkspaceSvg` exposes a new `isBusy` boolean set around `pushSnapshot`. `Canvas.tsx` mounts `CanvasOverlay` in both the vectorize viewport and the editor viewport.

**Tech Stack:** React, Tailwind CSS, TypeScript

---

### Task 1: Create `CanvasOverlay` component

**Files:**
- Create: `components/shared/CanvasOverlay.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

interface CanvasOverlayProps {
  isVisible: boolean;
}

export function CanvasOverlay({ isVisible }: CanvasOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px] dark:bg-gray-900/40">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shared/CanvasOverlay.tsx
git commit -m "feat: add CanvasOverlay spinner component"
```

---

### Task 2: Add `isBusy` to `useWorkspaceSvg`

**Files:**
- Modify: `hooks/useWorkspaceSvg.ts`

`pushSnapshot` is synchronous (lines 70–84). We add `isBusy` state that flips on/off around the operation using `flushSync` so React renders the busy state before the heavy DOM work executes.

- [ ] **Step 1: Add `flushSync` import and `isBusy` state**

At the top of `hooks/useWorkspaceSvg.ts`, update the React import and add the `flushSync` import:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
```

Inside `useWorkspaceSvg`, add after the existing `useState` calls:

```ts
const [isBusy, setIsBusy] = useState(false);
```

- [ ] **Step 2: Wrap `pushSnapshot` with `isBusy` toggling**

Replace the existing `pushSnapshot` (lines 70–84) with:

```ts
const pushSnapshot = useCallback(() => {
  flushSync(() => setIsBusy(true));
  const snapshot = serializeMountedSvg();
  if (!snapshot) {
    setIsBusy(false);
    return;
  }
  if (snapshot === historyRef.current[historyIndexRef.current]) {
    setIsBusy(false);
    return;
  }
  const nextIndex = historyIndexRef.current + 1;
  setHistory((prev) => {
    const base = prev.slice(0, historyIndexRef.current + 1);
    const next = [...base, snapshot];
    historyRef.current = next;
    return next;
  });
  historyIndexRef.current = nextIndex;
  setHistoryIndex(nextIndex);
  onSvgChange?.(snapshot);
  setIsBusy(false);
}, [serializeMountedSvg, onSvgChange]);
```

- [ ] **Step 3: Expose `isBusy` in the return value**

In the `return` statement (around line 133), add `isBusy`:

```ts
return {
  containerRef,
  svgEl,
  setSvgEl,
  mountSvg,
  pushSnapshot,
  undo,
  redo,
  canUndo: historyIndex > 0,
  canRedo: historyIndex < history.length - 1,
  zoom,
  serializeMountedSvg,
  isBusy,
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `isBusy` or `flushSync`.

- [ ] **Step 5: Commit**

```bash
git add hooks/useWorkspaceSvg.ts
git commit -m "feat: expose isBusy from useWorkspaceSvg via pushSnapshot"
```

---

### Task 3: Integrate `CanvasOverlay` in `Canvas.tsx`

**Files:**
- Modify: `components/workspace/Canvas.tsx`

- [ ] **Step 1: Add the import**

At the top of `components/workspace/Canvas.tsx`, add:

```ts
import { CanvasOverlay } from '@/components/shared/CanvasOverlay';
```

- [ ] **Step 2: Add overlay to the vectorize viewport**

Inside the vectorize view, the `div.relative.flex-1` wrapping the SVG and image viewports (around line 232) already has `relative`. Add `CanvasOverlay` as the first child:

```tsx
<div className="relative flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 transparent-preview">
  <CanvasOverlay isVisible={isLoading} />
  {/* existing vectorize content */}
```

- [ ] **Step 3: Add overlay to the editor viewport**

The editor section renders `ZoomableSvgViewport` inside a `div` (around line 264). Wrap the existing `div` content in a `relative` wrapper and add the overlay. Replace:

```tsx
<div className={isVectorizeView ? 'hidden' : undefined} aria-hidden={isVectorizeView}>
  <ZoomableSvgViewport
```

with:

```tsx
<div className={isVectorizeView ? 'hidden' : undefined} aria-hidden={isVectorizeView}>
  <div className="relative">
    <CanvasOverlay isVisible={editor?.isBusy ?? false} />
    <ZoomableSvgViewport
```

And close the extra `div` after `</ZoomableSvgViewport>` (before the portal `createPortal` calls — those stay outside):

```tsx
    />
  </div>
  {showEditorSurface && svgForPortals && activeTool === 'nodes' && ...}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/workspace/Canvas.tsx
git commit -m "feat: show CanvasOverlay spinner during vectorize and editor operations"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify vectorize spinner**

Upload an image. While the SVG is being computed (first load or after changing settings in the sidebar), the canvas area should show a spinner overlay on top of the SVG viewport.

- [ ] **Step 3: Verify editor spinner**

Switch to the edit view. Apply a color replace (pick a color → click a path) or use the eraser. A spinner should flash briefly over the editor canvas.

- [ ] **Step 4: Verify no layout regression**

Check that:
- The spinner does not appear in the empty-state (no image uploaded) view
- Portals (NodeEditor, BrushEditor) still render correctly after the wrapper `div` was added
- Dark mode shows the darker overlay variant
