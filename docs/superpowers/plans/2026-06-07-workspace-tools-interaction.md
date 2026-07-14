# Workspace Tools Unified Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix inconsistent canvas tool clicks by centralizing path interactions, remove Select, and move palette bulk actions to Optimize.

**Architecture:** Pure click-routing logic lives in `lib/canvasToolInteraction.ts` (unit-tested in Node). A React hook `useCanvasToolInteraction` delegates container clicks to that logic. Shape/label hooks keep state only; no native path listeners.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Tailwind 4, existing `useSvgColors`, `BrushEditor`, `NodeEditor`.

**Spec:** `docs/superpowers/specs/2026-06-07-workspace-tools-interaction-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/canvasToolInteraction.ts` | Pure: resolve path, route tool action, cursor map |
| `lib/canvasToolInteraction.test.ts` | Unit tests (Vitest, Node) |
| `hooks/useCanvasToolInteraction.ts` | React: wire click/mousemove/escape/highlight |
| `hooks/useWorkspaceShapeTools.ts` | State: selectedPath, brush, pathItems (no click listeners) |
| `hooks/useWorkspaceLabels.ts` | State: labels, editingPath (no click listeners) |
| `components/workspace/Canvas.tsx` | Use unified hook; remove inline handler |
| `components/workspace/inspectors/EyedropperInspector.tsx` | New eyedropper panel |
| `components/workspace/inspectors/OptimizeInspector.tsx` | Add palette section |
| `components/workspace/inspectors/SelectInspector.tsx` | Delete |
| `types/workspace.types.ts` | Remove `'select'` |
| `lib/workspaceTools.ts` | Remove select from toolbar + KEY_MAP |
| `lib/i18n.tsx` | New keys, remove tool.select |

---

### Task 1: Remove Select from types and toolbar config

**Files:**
- Modify: `types/workspace.types.ts`
- Modify: `lib/workspaceTools.ts`
- Modify: `lib/workspaceTools.test.ts`
- Modify: `components/workspace/ToolBar.tsx`

- [ ] **Step 1: Remove `select` from WorkspaceTool union**

In `types/workspace.types.ts`, remove the `'select'` line from the union.

- [ ] **Step 2: Update workspace tool groups**

In `lib/workspaceTools.ts`, edit group `edit` tools to:

```typescript
tools: [
  { id: 'eyedropper', shortcut: 'I' },
  { id: 'fill', shortcut: 'G' },
],
```

Remove `{ id: 'select', shortcut: 'V' }`.

Update `KEY_MAP`:

```typescript
const KEY_MAP: Record<string, WorkspaceTool> = {
  i: 'eyedropper', g: 'fill', e: 'erase',
  b: 'brush', a: 'nodes', l: 'labels', z: 'zoom',
};
```

- [ ] **Step 3: Update tests**

In `lib/workspaceTools.test.ts`, replace the keyboard test:

```typescript
describe('toolFromKeyboard', () => {
  it('maps i/g/e/b/a/l/z to tools', () => {
    expect(toolFromKeyboard('v')).toBeNull();
    expect(toolFromKeyboard('I')).toBe('eyedropper');
    expect(toolFromKeyboard('g')).toBe('fill');
    expect(toolFromKeyboard('e')).toBe('erase');
    expect(toolFromKeyboard('b')).toBe('brush');
    expect(toolFromKeyboard('a')).toBe('nodes');
    expect(toolFromKeyboard('l')).toBe('labels');
    expect(toolFromKeyboard('z')).toBe('zoom');
  });
});
```

- [ ] **Step 4: Remove select from ToolBar icons**

In `components/workspace/ToolBar.tsx`:
- Remove `Cursor` import
- Remove `select: Cursor` from `TOOL_ICONS`

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (workspaceTools tests updated; other failures from missing Select references are fixed in later tasks)

- [ ] **Step 6: Commit**

```bash
git add types/workspace.types.ts lib/workspaceTools.ts lib/workspaceTools.test.ts components/workspace/ToolBar.tsx
git commit -m "refactor: remove Select tool from workspace types and toolbar"
```

---

### Task 2: Pure canvas tool interaction logic (TDD)

**Files:**
- Create: `lib/canvasToolInteraction.ts`
- Create: `lib/canvasToolInteraction.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/canvasToolInteraction.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  getToolCursor,
  parsePathFill,
  routePathClick,
  type PathClickContext,
} from './canvasToolInteraction';
import type { RGBColor } from '@/types/svg.types';

function mockPath(fill: string): SVGPathElement {
  return { getAttribute: (name: string) => (name === 'fill' ? fill : null) } as SVGPathElement;
}

const red: RGBColor = { r: 255, g: 0, b: 0 };
const blue: RGBColor = { r: 0, g: 0, b: 255 };

describe('parsePathFill', () => {
  it('parses rgb fill', () => {
    expect(parsePathFill(mockPath('rgb(255, 0, 0)'))).toEqual(red);
  });
  it('returns null for missing fill', () => {
    expect(parsePathFill(mockPath('none'))).toBeNull();
  });
});

describe('routePathClick', () => {
  const baseCtx: PathClickContext = {
    fillColor: blue,
    selectedColor: null,
    replaceColor: () => {},
    pushSnapshot: () => {},
    removePath: () => {},
    setSelectedColor: () => {},
    setSelectedPath: () => {},
    setEditingLabelPath: () => {},
  };

  it('eyedropper sets selected color', () => {
    let picked: RGBColor | null = null;
    routePathClick('eyedropper', mockPath('rgb(255, 0, 0)'), {
      ...baseCtx,
      setSelectedColor: (c) => { picked = c; },
    });
    expect(picked).toEqual(red);
  });

  it('fill replaces when colors differ', () => {
    let replaced = false;
    routePathClick('fill', mockPath('rgb(255, 0, 0)'), {
      ...baseCtx,
      replaceColor: (from, to) => {
        replaced = from.r === 255 && to.b === 255;
      },
      pushSnapshot: () => {},
    });
    expect(replaced).toBe(true);
  });

  it('fill no-ops when same color', () => {
    let snapshotted = false;
    routePathClick('fill', mockPath('rgb(0, 0, 255)'), {
      ...baseCtx,
      pushSnapshot: () => { snapshotted = true; },
    });
    expect(snapshotted).toBe(false);
  });

  it('erase removes path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let removed: SVGPathElement | null = null;
    routePathClick('erase', path, {
      ...baseCtx,
      removePath: (p) => { removed = p; },
      pushSnapshot: () => {},
    });
    expect(removed).toBe(path);
  });

  it('nodes selects path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let selected: SVGPathElement | null = null;
    routePathClick('nodes', path, {
      ...baseCtx,
      setSelectedPath: (p) => { selected = p; },
    });
    expect(selected).toBe(path);
  });

  it('labels sets editing path', () => {
    const path = mockPath('rgb(255, 0, 0)');
    let editing: SVGPathElement | null = null;
    routePathClick('labels', path, {
      ...baseCtx,
      setEditingLabelPath: (p) => { editing = p; },
    });
    expect(editing).toBe(path);
  });
});

describe('getToolCursor', () => {
  it('returns crosshair for eyedropper', () => {
    expect(getToolCursor('eyedropper')).toBe('crosshair');
  });
  it('returns cell for fill', () => {
    expect(getToolCursor('fill')).toBe('cell');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/canvasToolInteraction.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement minimal module**

Create `lib/canvasToolInteraction.ts`:

```typescript
import { parseRgbString, rgbToHex } from '@/lib/colorUtils';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

export interface PathClickContext {
  fillColor: RGBColor;
  selectedColor: RGBColor | null;
  setSelectedColor: (color: RGBColor | null) => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  replaceColor: (from: RGBColor, to: RGBColor) => void;
  removePath: (path: SVGPathElement) => void;
  pushSnapshot: () => void;
}

export function parsePathFill(path: SVGPathElement): RGBColor | null {
  const fill = path.getAttribute('fill');
  if (!fill || fill === 'none') return null;
  return parseRgbString(fill);
}

export function routePathClick(
  activeTool: WorkspaceTool,
  path: SVGPathElement,
  ctx: PathClickContext
): void {
  const color = parsePathFill(path);
  if (!color) return;

  switch (activeTool) {
    case 'eyedropper':
      ctx.setSelectedColor(color);
      break;
    case 'fill':
      if (rgbToHex(color) !== rgbToHex(ctx.fillColor)) {
        ctx.replaceColor(color, ctx.fillColor);
        ctx.pushSnapshot();
      }
      break;
    case 'erase':
      ctx.removePath(path);
      ctx.pushSnapshot();
      break;
    case 'nodes':
      ctx.setSelectedPath(path);
      break;
    case 'labels':
      ctx.setEditingLabelPath(path);
      break;
    default:
      break;
  }
}

export function routeBackgroundClick(
  activeTool: WorkspaceTool,
  ctx: Pick<PathClickContext, 'setSelectedColor' | 'setSelectedPath' | 'setEditingLabelPath'>
): void {
  switch (activeTool) {
    case 'eyedropper':
      ctx.setSelectedColor(null);
      break;
    case 'nodes':
      ctx.setSelectedPath(null);
      break;
    case 'labels':
      ctx.setEditingLabelPath(null);
      break;
    default:
      break;
  }
}

const TOOL_CURSORS: Partial<Record<WorkspaceTool, string>> = {
  eyedropper: 'crosshair',
  fill: 'cell',
  erase: 'pointer',
  brush: 'crosshair',
  nodes: 'pointer',
  labels: 'crosshair',
};

export function getToolCursor(activeTool: WorkspaceTool): string {
  return TOOL_CURSORS[activeTool] ?? 'default';
}

export function resolvePathFromEvent(
  target: EventTarget | null,
  container: HTMLElement | null
): SVGPathElement | null {
  if (!(target instanceof Element) || !container) return null;
  const path = target.closest('path');
  if (!path || !container.contains(path)) return null;
  return path as SVGPathElement;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/canvasToolInteraction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/canvasToolInteraction.ts lib/canvasToolInteraction.test.ts
git commit -m "feat: add pure canvas tool click routing with tests"
```

---

### Task 3: React hook useCanvasToolInteraction

**Files:**
- Create: `hooks/useCanvasToolInteraction.ts`
- Modify: `hooks/useWorkspaceShapeTools.ts`
- Modify: `hooks/useWorkspaceLabels.ts`

- [ ] **Step 1: Strip click listeners from useWorkspaceShapeTools**

In `hooks/useWorkspaceShapeTools.ts`:
- Remove the `useEffect` that adds `addEventListener('click')` on paths (lines ~27–63)
- Keep `refreshPathItems`, `selectedPath`, brush state, `handleHover`, `handleDeleteItem`
- Add a exported `removePath(path: SVGPathElement)` callback:

```typescript
const removePath = useCallback(
  (path: SVGPathElement) => {
    path.remove();
    const svg = editor.containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (svg) refreshPathItems(svg);
    editor.pushSnapshot();
    setSelectedPath(null);
  },
  [editor.containerRef, editor.pushSnapshot, refreshPathItems]
);

return { /* existing */, removePath };
```

- [ ] **Step 2: Strip click listeners from useWorkspaceLabels**

In `hooks/useWorkspaceLabels.ts`:
- Remove the `useEffect` with path click handlers (lines ~24–47)
- Keep label state, `handleLabelSave`, `handleLabelClick`
- Export `setEditingPath` (already exported via return)

- [ ] **Step 3: Create useCanvasToolInteraction**

Create `hooks/useCanvasToolInteraction.ts`:

```typescript
'use client';

import { useCallback, useEffect, type MouseEvent, type RefObject } from 'react';
import {
  getToolCursor,
  resolvePathFromEvent,
  routeBackgroundClick,
  routePathClick,
  type PathClickContext,
} from '@/lib/canvasToolInteraction';
import type { RGBColor } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';

interface UseCanvasToolInteractionOptions {
  activeTool: WorkspaceTool;
  containerRef: RefObject<HTMLDivElement | null>;
  fillColor: RGBColor;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  replaceColor: (from: RGBColor, to: RGBColor) => void;
  pushSnapshot: () => void;
  setSelectedPath: (path: SVGPathElement | null) => void;
  setEditingLabelPath: (path: SVGPathElement | null) => void;
  removePath: (path: SVGPathElement) => void;
  onEraseHover: (path: SVGPathElement | null) => void;
}

export function useCanvasToolInteraction({
  activeTool,
  containerRef,
  fillColor,
  selectedColor,
  onSelectedColorChange,
  replaceColor,
  pushSnapshot,
  setSelectedPath,
  setEditingLabelPath,
  removePath,
  onEraseHover,
}: UseCanvasToolInteractionOptions) {
  const buildCtx = useCallback((): PathClickContext => ({
    fillColor,
    selectedColor,
    setSelectedColor: onSelectedColorChange,
    setSelectedPath,
    setEditingLabelPath,
    replaceColor,
    removePath,
    pushSnapshot,
  }), [fillColor, selectedColor, onSelectedColorChange, setSelectedPath, setEditingLabelPath, replaceColor, removePath, pushSnapshot]);

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool === 'brush' || activeTool === 'optimize' || activeTool === 'zoom') return;

      const path = resolvePathFromEvent(event.target, containerRef.current);
      const ctx = buildCtx();

      if (path) {
        routePathClick(activeTool, path, ctx);
      } else {
        routeBackgroundClick(activeTool, ctx);
      }
    },
    [activeTool, containerRef, buildCtx]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'erase') {
        onEraseHover(null);
        return;
      }
      const path = resolvePathFromEvent(event.target, containerRef.current);
      onEraseHover(path);
    },
    [activeTool, containerRef, onEraseHover]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      routeBackgroundClick(activeTool, buildCtx());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTool, buildCtx]);

  const cursor = getToolCursor(activeTool);

  return { handleCanvasClick, handleCanvasMouseMove, cursor };
}
```

- [ ] **Step 4: Run type-check**

Run: `npm run type-check`
Expected: PASS (Canvas not wired yet; no new errors in hook files)

- [ ] **Step 5: Commit**

```bash
git add hooks/useCanvasToolInteraction.ts hooks/useWorkspaceShapeTools.ts hooks/useWorkspaceLabels.ts
git commit -m "feat: add useCanvasToolInteraction hook and remove path click listeners"
```

---

### Task 4: Wire Canvas to unified hook

**Files:**
- Modify: `components/workspace/Canvas.tsx`
- Modify: `components/workspace/Workspace.tsx`

- [ ] **Step 1: Update Workspace default tool**

In `components/workspace/Workspace.tsx`, change `handleSvgReady`:

```typescript
setActiveTool('eyedropper');
```

- [ ] **Step 2: Wire Canvas**

In `components/workspace/Canvas.tsx`:

1. Import `useCanvasToolInteraction`
2. Remove inline `handleSvgClick`
3. Remove `activeTool === 'select'` from `useTransparent` check
4. After `const { replaceColor } = useSvgColors(...)`, add:

```typescript
const { handleCanvasClick, handleCanvasMouseMove, cursor } = useCanvasToolInteraction({
  activeTool,
  containerRef: editor?.containerRef ?? { current: null },
  fillColor,
  selectedColor,
  onSelectedColorChange,
  replaceColor,
  pushSnapshot: editor?.pushSnapshot ?? (() => {}),
  setSelectedPath: shapeTools.setSelectedPath,
  setEditingLabelPath: labelTools.setEditingPath,
  removePath: shapeTools.removePath,
  onEraseHover: shapeTools.handleHover,
});
```

5. Pass to `ZoomableSvgViewport`:

```typescript
onClick={handleCanvasClick}
onMouseMove={handleCanvasMouseMove}
```

6. Add cursor to viewport className/style when svg is shown:

```typescript
style={{
  ...(useTransparent ? undefined : previewStyle),
  cursor: activeTool === 'zoom' ? undefined : cursor,
}}
```

7. Pass `labelTools` into Canvas props from Workspace (add to CanvasProps if not present)

- [ ] **Step 3: Extend ZoomableSvgViewport for mousemove**

In `components/shared/ZoomableSvgViewport.tsx`, add optional `onMouseMove` prop and pass to container div.

- [ ] **Step 4: Run type-check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/workspace/Canvas.tsx components/workspace/Workspace.tsx components/shared/ZoomableSvgViewport.tsx
git commit -m "feat: wire Canvas to unified tool interaction hook"
```

---

### Task 5: EyedropperInspector

**Files:**
- Create: `components/workspace/inspectors/EyedropperInspector.tsx`
- Modify: `components/workspace/Inspector.tsx`

- [ ] **Step 1: Create EyedropperInspector**

Create `components/workspace/inspectors/EyedropperInspector.tsx`:

```tsx
'use client';

import type { RGBColor } from '@/types/svg.types';
import { rgbToHex } from '@/lib/colorUtils';
import { ColorPicker } from '@/components/colors/ColorPicker';
import { useSvgColors } from '@/hooks/useSvgColors';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceTool } from '@/types/workspace.types';

interface EyedropperInspectorProps {
  svgEl: SVGElement | null;
  selectedColor: RGBColor | null;
  onSelectedColorChange: (color: RGBColor | null) => void;
  onFillColorChange: (color: RGBColor) => void;
  onToolChange: (tool: WorkspaceTool) => void;
  onPushSnapshot: () => void;
}

export function EyedropperInspector({
  svgEl,
  selectedColor,
  onSelectedColorChange,
  onFillColorChange,
  onToolChange,
  onPushSnapshot,
}: EyedropperInspectorProps) {
  const { t } = useI18n();
  const { replaceColor } = useSvgColors(svgEl);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('tool.eyedropper')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('col.eyedropperHint')}</p>
      </div>

      {selectedColor ? (
        <>
          <div
            className="h-10 w-full rounded border border-gray-200 dark:border-gray-700"
            style={{ backgroundColor: rgbToHex(selectedColor) }}
          />
          <p className="font-mono text-xs text-gray-600 dark:text-gray-400">{rgbToHex(selectedColor)}</p>
          <ColorPicker
            color={selectedColor}
            onChange={(newColor) => {
              if (!selectedColor) return;
              replaceColor(selectedColor, newColor);
              onSelectedColorChange(newColor);
              onPushSnapshot();
            }}
            onCommit={onPushSnapshot}
          />
          <button
            type="button"
            onClick={() => {
              onFillColorChange(selectedColor);
              onToolChange('fill');
            }}
            className="focus-ring w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t('col.useAsFill')}
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('col.eyedropperEmpty')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire Inspector**

In `components/workspace/Inspector.tsx`:
- Remove `SelectInspector` import and block
- Remove inline eyedropper div block
- Import and render `EyedropperInspector` when `activeTool === 'eyedropper' && editor`

- [ ] **Step 3: Commit**

```bash
git add components/workspace/inspectors/EyedropperInspector.tsx components/workspace/Inspector.tsx
git commit -m "feat: add EyedropperInspector with use-as-fill action"
```

---

### Task 6: Migrate palette to OptimizeInspector and delete SelectInspector

**Files:**
- Modify: `components/workspace/inspectors/OptimizeInspector.tsx`
- Delete: `components/workspace/inspectors/SelectInspector.tsx`

- [ ] **Step 1: Expand OptimizeInspector**

Copy palette UI from `SelectInspector.tsx` into `OptimizeInspector.tsx`:
- Add props: `svgEl: SVGElement | null`, `onPushSnapshot: () => void`, `onSelectedColorChange: (c: RGBColor | null) => void`, `selectedColor: RGBColor | null`
- Import `useSvgColors`, `ColorSwatches`, `Tooltip`, `extractPaletteFromSvgString`
- Add collapsible **Palette** section at top (swatches, reduce slider, normalize, snap black, original palette)
- Keep existing **Optimization** section below with `t('optimize.optimizeSection')` heading
- Palette section heading uses `t('optimize.paletteSection')`

- [ ] **Step 2: Update Inspector optimize block**

Pass new props from `editor` and `selectedColor` state.

- [ ] **Step 3: Delete SelectInspector.tsx**

```bash
git rm components/workspace/inspectors/SelectInspector.tsx
```

- [ ] **Step 4: Run type-check**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/workspace/inspectors/OptimizeInspector.tsx components/workspace/Inspector.tsx
git commit -m "feat: move palette bulk actions to Optimize inspector"
```

---

### Task 7: i18n updates

**Files:**
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Add and remove keys**

Remove:
- `'tool.select'`

Add:
```typescript
'col.eyedropperHint': { en: 'Click a shape in the canvas to pick its fill color.', es: 'Haz clic en una forma del lienzo para recoger su color de relleno.' },
'col.eyedropperEmpty': { en: 'No color picked yet.', es: 'Aún no has recogido ningún color.' },
'col.useAsFill': { en: 'Use as fill', es: 'Usar como relleno' },
'optimize.paletteSection': { en: 'Palette', es: 'Paleta' },
'optimize.optimizeSection': { en: 'Optimization', es: 'Optimización' },
```

Update `'col.subtitle'` to eyedropper-oriented copy (remove "select" wording).

- [ ] **Step 2: Commit**

```bash
git add lib/i18n.tsx
git commit -m "i18n: update tool labels for eyedropper-first workflow"
```

---

### Task 8: Status feedback and label wiring cleanup

**Files:**
- Modify: `components/workspace/Workspace.tsx`
- Modify: `components/workspace/Canvas.tsx`
- Modify: `components/workspace/StatusBar.tsx`

- [ ] **Step 1: Pass labelTools to Canvas**

Ensure `Canvas` receives `labelTools.setEditingPath` (or full `labelTools` object) from Workspace.

- [ ] **Step 2: Optional status message**

Add `statusMessage` state in Workspace; pass setter to Canvas/hook via callback when eyedropper picks color or fill replaces. Render in StatusBar with `aria-live="polite"`.

Minimal implementation in StatusBar:

```tsx
{statusMessage && (
  <span aria-live="polite" className="sr-only">{statusMessage}</span>
)}
```

- [ ] **Step 3: Run full test suite**

Run: `npm test && npm run type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/workspace/Workspace.tsx components/workspace/Canvas.tsx components/workspace/StatusBar.tsx
git commit -m "feat: wire label tools and a11y status feedback for canvas actions"
```

---

### Task 9: Manual verification checklist

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify each tool**

1. Upload PNG → vectorize → lands on **Eyedropper**
2. Eyedropper: click path → color in inspector; Escape clears
3. "Use as fill" → switches to Fill with color loaded
4. Fill: click path → all matching paths recolor
5. Erase: hover highlights; click deletes; list updates
6. Brush: draws stroke; undo works
7. Nodes: click path → handles; drag node; background deselects
8. Labels: click path → input; save sets data-label
9. Optimize: palette normalize + clean fragments both work
10. Switch tools rapidly: no stuck listeners or double actions

- [ ] **Step 3: Final commit if any fixups**

```bash
git add -A
git commit -m "fix: address workspace tool interaction edge cases from manual QA"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Remove Select | Task 1 |
| Unified click handler | Tasks 2–4 |
| Eyedropper inspector | Task 5 |
| Palette in Optimize | Task 6 |
| Default eyedropper | Task 4 |
| i18n | Task 7 |
| Escape / edge cases | Tasks 2, 3, 8 |
| Success criteria manual QA | Task 9 |

## Plan self-review

- No TBD/TODO placeholders
- Types consistent: `PathClickContext`, `removePath`, `setEditingLabelPath` used same names throughout
- Tests run in existing Vitest config (`lib/**/*.test.ts`)
- Each task produces committable increment
