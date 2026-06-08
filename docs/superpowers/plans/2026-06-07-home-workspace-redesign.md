# Home Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-step wizard home with a Photoshop-style workspace (toolbar + canvas + inspector) optimized for flat icon SVG workflows, using Phosphor icons.

**Architecture:** Introduce `components/workspace/` as the new UI shell. Pure tool-enablement rules live in `lib/workspaceTools.ts` (tested). Existing step logic is lifted into inspector components and a shared `useWorkspaceSvg` hook for SVG mount/zoom/undo. `page.tsx` renders only `<Workspace />`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `@phosphor-icons/react`, existing imagetracerjs worker pipeline.

**Spec:** `docs/superpowers/specs/2026-06-07-home-workspace-redesign.md`

---

## File map

| File | Responsibility |
|---|---|
| `types/workspace.types.ts` | `WorkspaceTool`, toolbar config types |
| `lib/workspaceTools.ts` | Pure functions: `isToolEnabled`, `toolFromKeyboard` |
| `lib/workspaceTools.test.ts` | Unit tests for tool rules + shortcuts |
| `components/workspace/Workspace.tsx` | Top-level state + layout grid |
| `components/workspace/ToolBar.tsx` | Vertical tool strip |
| `components/workspace/ToolButton.tsx` | 40×40 icon button |
| `components/shared/ToolTooltip.tsx` | Hover tooltip (400 ms delay) |
| `components/workspace/TopBar.tsx` | Brand, undo/redo, download, theme/lang |
| `components/workspace/StatusBar.tsx` | Paths, bytes, zoom, shortcut hint |
| `components/workspace/Canvas.tsx` | Dropzone / split preview / SVG viewport |
| `components/workspace/Inspector.tsx` | Routes to active inspector panel |
| `components/workspace/inspectors/*.tsx` | One panel per tool |
| `hooks/useWorkspaceSvg.ts` | Shared SVG mount, zoom, serialize, undo |
| `hooks/useWorkspaceShortcuts.ts` | Global keyboard shortcuts |
| `app/page.tsx` | Render `<Workspace />` only |
| `components/shared/AppShell.tsx` | Full-height workspace chrome |
| `lib/i18n.tsx` | `tool.*`, `workspace.*`, `inspector.*` keys |

**Removed after parity:** `components/shared/StepIndicator.tsx`, `components/upload/UploadStep.tsx`, `components/vectorize/VectorizeStep.tsx`, `components/colors/ColorEditStep.tsx`, `components/shape/ShapeEditStep.tsx`, `components/labels/LabelStep.tsx`

---

### Task 1: Workspace types, tool rules, and Phosphor dependency

**Files:**
- Create: `types/workspace.types.ts`
- Create: `lib/workspaceTools.ts`
- Create: `lib/workspaceTools.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Phosphor**

```bash
npm install @phosphor-icons/react
```

Expected: `package.json` lists `"@phosphor-icons/react"` in dependencies.

- [ ] **Step 2: Write the failing tests**

Create `lib/workspaceTools.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isToolEnabled, toolFromKeyboard, WORKSPACE_TOOLS } from './workspaceTools';
import type { WorkspaceDocument } from '@/types/workspace.types';

const empty: WorkspaceDocument = { imageData: null, svgString: null };
const withImage: WorkspaceDocument = { imageData: {} as ImageData, svgString: null };
const withSvg: WorkspaceDocument = { imageData: {} as ImageData, svgString: '<svg></svg>' };

describe('isToolEnabled', () => {
  it('enables import always', () => {
    expect(isToolEnabled('import', empty)).toBe(true);
  });
  it('enables vectorize only with imageData', () => {
    expect(isToolEnabled('vectorize', empty)).toBe(false);
    expect(isToolEnabled('vectorize', withImage)).toBe(true);
  });
  it('enables edit tools only with svgString', () => {
    for (const tool of WORKSPACE_TOOLS) {
      if (tool === 'import' || tool === 'vectorize') continue;
      expect(isToolEnabled(tool, withImage)).toBe(false);
      expect(isToolEnabled(tool, withSvg)).toBe(true);
    }
  });
});

describe('toolFromKeyboard', () => {
  it('maps v/i/g/e/b/a/l/z to tools', () => {
    expect(toolFromKeyboard('v')).toBe('select');
    expect(toolFromKeyboard('I')).toBe('eyedropper');
    expect(toolFromKeyboard('g')).toBe('fill');
    expect(toolFromKeyboard('e')).toBe('erase');
    expect(toolFromKeyboard('b')).toBe('brush');
    expect(toolFromKeyboard('a')).toBe('nodes');
    expect(toolFromKeyboard('l')).toBe('labels');
    expect(toolFromKeyboard('z')).toBe('zoom');
  });
  it('returns null for unrelated keys', () => {
    expect(toolFromKeyboard('x')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- lib/workspaceTools.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Write minimal implementation**

Create `types/workspace.types.ts`:

```ts
export type WorkspaceTool =
  | 'import'
  | 'vectorize'
  | 'select'
  | 'eyedropper'
  | 'fill'
  | 'erase'
  | 'brush'
  | 'nodes'
  | 'labels'
  | 'optimize'
  | 'zoom';

export interface WorkspaceDocument {
  imageData: ImageData | null;
  svgString: string | null;
}

export interface ToolDefinition {
  id: WorkspaceTool;
  icon: string; // Phosphor component name — resolved in ToolBar
  shortcut?: string;
  group: 'file' | 'vectorize' | 'edit' | 'pro' | 'output' | 'view';
}
```

Create `lib/workspaceTools.ts`:

```ts
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

export const WORKSPACE_TOOLS: WorkspaceTool[] = [
  'import', 'vectorize', 'select', 'eyedropper', 'fill',
  'erase', 'brush', 'nodes', 'labels', 'optimize', 'zoom',
];

const SVG_TOOLS = new Set<WorkspaceTool>(
  WORKSPACE_TOOLS.filter((t) => t !== 'import' && t !== 'vectorize')
);

const KEY_MAP: Record<string, WorkspaceTool> = {
  v: 'select', i: 'eyedropper', g: 'fill', e: 'erase',
  b: 'brush', a: 'nodes', l: 'labels', z: 'zoom',
};

export function isToolEnabled(tool: WorkspaceTool, doc: WorkspaceDocument): boolean {
  if (tool === 'import') return true;
  if (tool === 'vectorize') return doc.imageData !== null;
  return doc.svgString !== null && SVG_TOOLS.has(tool);
}

export function toolFromKeyboard(key: string): WorkspaceTool | null {
  return KEY_MAP[key.toLowerCase()] ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- lib/workspaceTools.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json types/workspace.types.ts lib/workspaceTools.ts lib/workspaceTools.test.ts
git commit -m "feat(workspace): add tool types, enablement rules, and Phosphor dep"
```

---

### Task 2: ToolTooltip and ToolButton

**Files:**
- Create: `components/shared/ToolTooltip.tsx`
- Create: `components/workspace/ToolButton.tsx`

- [ ] **Step 1: Create ToolTooltip**

```tsx
'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface ToolTooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

export function ToolTooltip({ label, shortcut, children }: ToolTooltipProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    timer.current = setTimeout(() => setOpen(true), 400);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow-lg dark:bg-gray-950"
        >
          {label}
          {shortcut && <span className="ml-2 text-gray-400">{shortcut}</span>}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Create ToolButton**

```tsx
'use client';

import type { Icon } from '@phosphor-icons/react';
import { ToolTooltip } from '@/components/shared/ToolTooltip';

interface ToolButtonProps {
  icon: Icon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ToolButton({ icon: IconComponent, label, shortcut, active, disabled, onClick }: ToolButtonProps) {
  return (
    <ToolTooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        role="button"
        aria-label={label}
        aria-pressed={active}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={onClick}
        className={[
          'flex h-10 w-10 items-center justify-center rounded-md border transition',
          active
            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
            : 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        ].join(' ')}
      >
        <IconComponent size={20} weight={active ? 'fill' : 'regular'} aria-hidden />
      </button>
    </ToolTooltip>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/shared/ToolTooltip.tsx components/workspace/ToolButton.tsx
git commit -m "feat(workspace): add ToolButton with Phosphor icons and hover tooltip"
```

---

### Task 3: ToolBar with all tools

**Files:**
- Create: `components/workspace/ToolBar.tsx`
- Modify: `lib/i18n.tsx` (add `tool.*` keys)

- [ ] **Step 1: Add i18n keys**

In `lib/i18n.tsx`, add:

```ts
'tool.import': { en: 'Import image', es: 'Importar imagen' },
'tool.vectorize': { en: 'Vectorize', es: 'Vectorizar' },
'tool.select': { en: 'Select', es: 'Seleccionar' },
'tool.eyedropper': { en: 'Eyedropper', es: 'Cuentagotas' },
'tool.fill': { en: 'Fill', es: 'Rellenar' },
'tool.erase': { en: 'Erase', es: 'Borrar' },
'tool.brush': { en: 'Brush', es: 'Pincel' },
'tool.nodes': { en: 'Nodes', es: 'Nodos' },
'tool.labels': { en: 'Labels', es: 'Etiquetas' },
'tool.optimize': { en: 'Optimize', es: 'Optimizar' },
'tool.zoom': { en: 'Zoom', es: 'Zoom' },
```

- [ ] **Step 2: Create ToolBar**

```tsx
'use client';

import {
  Cursor, Eraser, Eyedropper, ImageSquare, Lightning, MagicWand,
  MagnifyingGlass, PaintBrush, PaintBucket, PenNib, Tag,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import { isToolEnabled } from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

const TOOL_CONFIG: { id: WorkspaceTool; icon: Icon; shortcut?: string }[] = [
  { id: 'import', icon: ImageSquare },
  { id: 'vectorize', icon: MagicWand },
  { id: 'select', icon: Cursor, shortcut: 'V' },
  { id: 'eyedropper', icon: Eyedropper, shortcut: 'I' },
  { id: 'fill', icon: PaintBucket, shortcut: 'G' },
  { id: 'erase', icon: Eraser, shortcut: 'E' },
  { id: 'brush', icon: PaintBrush, shortcut: 'B' },
  { id: 'nodes', icon: PenNib, shortcut: 'A' },
  { id: 'labels', icon: Tag, shortcut: 'L' },
  { id: 'optimize', icon: Lightning },
  { id: 'zoom', icon: MagnifyingGlass, shortcut: 'Z' },
];

const SEPARATORS_AFTER = new Set<WorkspaceTool>(['import', 'fill', 'labels']);

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
}

export function ToolBar({ activeTool, document, onToolChange }: ToolBarProps) {
  const { t } = useI18n();
  return (
    <nav role="toolbar" aria-label="Tools" className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-white py-2 dark:border-gray-700 dark:bg-gray-800">
      {TOOL_CONFIG.map(({ id, icon, shortcut }) => (
        <div key={id} className="flex flex-col items-center gap-1">
          <ToolButton
            icon={icon}
            label={t(`tool.${id}`)}
            shortcut={shortcut}
            active={activeTool === id}
            disabled={!isToolEnabled(id, document)}
            onClick={() => onToolChange(id)}
          />
          {SEPARATORS_AFTER.has(id) && <div className="my-1 h-px w-8 bg-gray-200 dark:bg-gray-700" />}
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

- [ ] **Step 4: Commit**

```bash
git add components/workspace/ToolBar.tsx lib/i18n.tsx
git commit -m "feat(workspace): add vertical ToolBar with Phosphor icons and i18n"
```

---

### Task 4: Workspace shell — TopBar, StatusBar, layout grid

**Files:**
- Create: `components/workspace/TopBar.tsx`
- Create: `components/workspace/StatusBar.tsx`
- Create: `components/workspace/Workspace.tsx` (skeleton)
- Modify: `components/shared/AppShell.tsx`
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Add workspace i18n keys**

```ts
'workspace.download': { en: 'Download SVG', es: 'Descargar SVG' },
'workspace.undo': { en: 'Undo', es: 'Deshacer' },
'workspace.redo': { en: 'Redo', es: 'Rehacer' },
'workspace.paths': { en: 'paths', es: 'formas' },
'workspace.shortcutHint': { en: 'Press shortcut keys to switch tools', es: 'Usa atajos de teclado para cambiar herramientas' },
```

- [ ] **Step 2: Create TopBar** — brand left; center: undo/redo (`ArrowCounterClockwise`, `ArrowClockwise` from Phosphor); right: `DownloadButton` + theme/lang toggles migrated to Phosphor (`Moon`, `Sun`, `Globe`). Props: `svgString`, `canUndo`, `canRedo`, `onUndo`, `onRedo`.

- [ ] **Step 3: Create StatusBar** — props: `pathCount`, `byteSize`, `zoomPercent`, `activeToolLabel`. Use `text-xs text-gray-500`.

- [ ] **Step 4: Create Workspace skeleton**

```tsx
'use client';

import { useState } from 'react';
import { DEFAULT_ZOOM_VIEWPORT, type SvgZoomViewport } from '@/types/svg.types';
import type { WorkspaceTool } from '@/types/workspace.types';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';

export function Workspace() {
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('import');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [zoomViewport, setZoomViewport] = useState<SvgZoomViewport>(DEFAULT_ZOOM_VIEWPORT);

  const document = { imageData, svgString };

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-8rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
        <TopBar svgString={svgString} canUndo={false} canRedo={false} onUndo={() => {}} onRedo={() => {}} />
        <div className="flex min-h-0 flex-1">
          <ToolBar activeTool={activeTool} document={document} onToolChange={setActiveTool} />
          <Canvas
            activeTool={activeTool}
            imageData={imageData}
            svgString={svgString}
            zoomViewport={zoomViewport}
            onZoomViewportChange={setZoomViewport}
            onImageData={setImageData}
            onSvgString={setSvgString}
            onToolChange={setActiveTool}
          />
          <Inspector
            activeTool={activeTool}
            imageData={imageData}
            svgString={svgString}
            zoomViewport={zoomViewport}
            onZoomViewportChange={setZoomViewport}
            onImageData={setImageData}
            onSvgString={setSvgString}
          />
        </div>
        <StatusBar pathCount={0} byteSize={0} zoomPercent={100} activeTool={activeTool} />
      </div>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 5: Update AppShell** — change `main` to `className="flex-1 w-full mx-auto px-3 sm:px-4 py-4"` (drop `max-w-6xl`).

- [ ] **Step 6: Wire page.tsx**

```tsx
'use client';
import { Workspace } from '@/components/workspace/Workspace';

export default function Home() {
  return <Workspace />;
}
```

- [ ] **Step 7: Create stub Canvas.tsx and Inspector.tsx** that render placeholder text so the app compiles.

- [ ] **Step 8: Verify dev build**

```bash
npm run type-check && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add components/workspace/ app/page.tsx components/shared/AppShell.tsx lib/i18n.tsx
git commit -m "feat(workspace): add shell layout with TopBar, ToolBar, and StatusBar"
```

---

### Task 5: Canvas — dropzone empty state and import flow

**Files:**
- Create: `components/workspace/Canvas.tsx` (replace stub)
- Modify: `components/workspace/Workspace.tsx`

- [ ] **Step 1: Implement Canvas import mode**

When `activeTool === 'import'` OR `imageData === null`, render centered `ImageDropzone` from `components/upload/ImageDropzone.tsx` inside a flex-centered canvas area. On `onImageData`:

```ts
onImageData={(data) => {
  onImageData(data);
  onToolChange('vectorize');
}}
```

- [ ] **Step 2: Show privacy line** below dropzone using `t('upload.privacy')`.

- [ ] **Step 3: When image exists and tool !== vectorize**, render `ZoomableSvgViewport` placeholder (“SVG canvas — tool wiring in Task 7”) for non-vectorize tools; vectorize mode handled in Task 6.

- [ ] **Step 4: Manual smoke test** — `npm run dev`, drop image, confirm toolbar enables vectorize + switches to vectorize tool.

- [ ] **Step 5: Commit**

```bash
git add components/workspace/Canvas.tsx components/workspace/Workspace.tsx
git commit -m "feat(workspace): add canvas dropzone empty state and import flow"
```

---

### Task 6: Vectorize inspector and split canvas

**Files:**
- Create: `components/workspace/inspectors/VectorizeInspector.tsx`
- Modify: `components/workspace/Canvas.tsx`
- Modify: `components/workspace/Inspector.tsx`

- [ ] **Step 1: Extract vectorize logic from VectorizeStep**

Move state and effects from `components/vectorize/VectorizeStep.tsx` into `VectorizeInspector.tsx`:
- `settings`, `removeBg`, `bgTolerance`, `contiguous`, `seeds`
- `useVectorizer`, `processedImageData`, auto-revectorize `useEffect` (300 ms debounce)
- `VectorizeSettingsPanel`, background removal controls
- **Remove** `EditablePalette` interactivity — replace with read-only `PalettePreview` only
- **Remove** `DownloadButton` and “Continue to Colors” button
- **Remove** manual `handleVectorize` button (keep `vec.auto` hint text)
- On first successful `svg` from worker, call `onSvgString(svg)` and `onToolChange('select')` once (use a `hasAutoAdvanced` ref)

- [ ] **Step 2: Canvas vectorize mode**

When `activeTool === 'vectorize'`, render 2-column grid: `ImagePreview` (with seed picking) | `SvgPreview` + `PalettePreview`. Reuse components from `components/vectorize/`.

- [ ] **Step 3: Inspector router**

```tsx
// Inspector.tsx
{activeTool === 'vectorize' && imageData && (
  <VectorizeInspector imageData={imageData} svgString={svgString} onSvgString={onSvgString} onToolChange={onToolChange} />
)}
```

- [ ] **Step 4: Pass optimize actions** — keep `handleCleanFragments` / `handleMaxOptimize` for Task 10 (OptimizeInspector); do not duplicate in vectorize panel.

- [ ] **Step 5: Test vectorize flow manually** — upload PNG, adjust color count, confirm split preview updates and auto-switches to Select when done.

- [ ] **Step 6: Commit**

```bash
git add components/workspace/inspectors/VectorizeInspector.tsx components/workspace/Canvas.tsx components/workspace/Inspector.tsx
git commit -m "feat(workspace): wire vectorize inspector and split canvas preview"
```

---

### Task 7: Shared SVG editor hook

**Files:**
- Create: `hooks/useWorkspaceSvg.ts`

- [ ] **Step 1: Create hook** — extract mount pattern from `ColorEditStep.tsx` lines 62–124:

```ts
export function useWorkspaceSvg(svgString: string | null, zoomViewport: SvgZoomViewport, onZoomViewportChange: (v: SvgZoomViewport) => void) {
  // containerRef, svgEl, mountSvg, serializeMountedSvg via useSvgZoom
  // history + historyIndex + pushSnapshot + restore + canUndo + canRedo
  // return { containerRef, svgEl, mountSvg, pushSnapshot, restore, canUndo, canRedo, serializeMountedSvg }
}
```

- [ ] **Step 2: Wire undo/redo to Workspace** — lift `canUndo/canRedo/onUndo/onRedo` from hook state at Workspace level when `svgString` changes. TopBar buttons call `restore(index ± 1)`.

- [ ] **Step 3: Canvas SVG mode** — when `svgString` and tool is an edit tool, render:

```tsx
<ZoomableSvgViewport containerRef={containerRef} zoom={zoom} />
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useWorkspaceSvg.ts components/workspace/Workspace.tsx components/workspace/Canvas.tsx components/workspace/TopBar.tsx
git commit -m "feat(workspace): add shared SVG mount hook with undo/redo"
```

---

### Task 8: Select inspector (color editing)

**Files:**
- Create: `components/workspace/inspectors/SelectInspector.tsx`
- Modify: `components/workspace/Inspector.tsx`
- Modify: `components/workspace/Canvas.tsx`

- [ ] **Step 1: Port ColorEditStep inspector UI** into `SelectInspector.tsx`:
- Swatches, ColorPicker, merge/normalize/reduce, before/after toggle, original palette row
- **Omit** `eraseMode` entirely (erase lives in Erase tool)
- Wire path click → select color via `useSvgColors(svgEl)`
- Wire `pushSnapshot` on color mutations

- [ ] **Step 2: Canvas select mode** — attach path `cursor: pointer` click handler on mounted SVG (copy from ColorEditStep `handleSvgClick` without erase branch).

- [ ] **Step 3: Default tool** — confirm after vectorize completes, `activeTool` becomes `select`.

- [ ] **Step 4: Commit**

```bash
git add components/workspace/inspectors/SelectInspector.tsx components/workspace/Inspector.tsx components/workspace/Canvas.tsx
git commit -m "feat(workspace): add Select inspector for color editing"
```

---

### Task 9: Eyedropper and Fill tools

**Files:**
- Create: `components/workspace/inspectors/EyedropperInspector.tsx`
- Create: `components/workspace/inspectors/FillInspector.tsx`
- Modify: `components/workspace/Canvas.tsx`

- [ ] **Step 1: Eyedropper** — on path click, `parseRgbString(path.getAttribute('fill'))` → show in inspector with color swatch. Button “Apply to selected paths” calls `replaceColor` if a prior selection exists.

- [ ] **Step 2: Fill** — inspector shows active fill color picker. On path click, `replaceColor(oldFill, activeFill)` for all paths matching `oldFill` (same as swatch bulk replace).

- [ ] **Step 3: Canvas cursor** — eyedropper: `cursor: crosshair`; fill: `cursor: cell`.

- [ ] **Step 4: Commit**

```bash
git add components/workspace/inspectors/EyedropperInspector.tsx components/workspace/inspectors/FillInspector.tsx components/workspace/Canvas.tsx
git commit -m "feat(workspace): add Eyedropper and Fill tools"
```

---

### Task 10: Erase, Brush, and Nodes inspectors

**Files:**
- Create: `components/workspace/inspectors/EraseInspector.tsx`
- Create: `components/workspace/inspectors/BrushInspector.tsx`
- Create: `components/workspace/inspectors/NodesInspector.tsx`
- Modify: `components/workspace/Canvas.tsx`

- [ ] **Step 1: Port from ShapeEditStep** — split by mode:
- `EraseInspector`: `PathList` + delete hint (reuse `components/shape/PathList.tsx`)
- `BrushInspector`: color + size sliders (reuse `BrushEditor` logic)
- `NodesInspector`: hint text + deselect button (reuse `NodeEditor` logic)

- [ ] **Step 2: Canvas interaction** — port `ShapeEditStep` mode handlers; each tool sets internal mode equivalent (`erase` / `brush` / `nodes`). On path click in erase mode: remove path + `pushSnapshot`.

- [ ] **Step 3: Commit**

```bash
git add components/workspace/inspectors/EraseInspector.tsx components/workspace/inspectors/BrushInspector.tsx components/workspace/inspectors/NodesInspector.tsx components/workspace/Canvas.tsx
git commit -m "feat(workspace): add Erase, Brush, and Nodes tools"
```

---

### Task 11: Labels, Optimize, Zoom inspectors

**Files:**
- Create: `components/workspace/inspectors/LabelsInspector.tsx`
- Create: `components/workspace/inspectors/OptimizeInspector.tsx`
- Create: `components/workspace/inspectors/ZoomInspector.tsx`
- Create: `components/workspace/inspectors/ImportInspector.tsx`
- Modify: `components/workspace/Inspector.tsx`

- [ ] **Step 1: LabelsInspector** — port `LabelStep` sidebar + label mode click wiring; pass `labels` to `DownloadButton` in TopBar for legend comment.

- [ ] **Step 2: OptimizeInspector** — port `handleCleanFragments` and `handleMaxOptimize` from old `VectorizeStep`; show `formatBytes(svgByteSize(svg))` and `countPaths(svg)`.

- [ ] **Step 3: ZoomInspector** — port zoom controls from `ZoomControls` + preview background toggle from ShapeEditStep.

- [ ] **Step 4: ImportInspector** — format hints, privacy, “Replace image” button that clears `svgString` and opens dropzone (set `activeTool` to `import`).

- [ ] **Step 5: Complete Inspector.tsx router** — switch on `activeTool` for all 11 panels.

- [ ] **Step 6: Commit**

```bash
git add components/workspace/inspectors/ components/workspace/Inspector.tsx
git commit -m "feat(workspace): add remaining inspector panels"
```

---

### Task 12: Keyboard shortcuts and StatusBar wiring

**Files:**
- Create: `hooks/useWorkspaceShortcuts.ts`
- Modify: `components/workspace/Workspace.tsx`
- Modify: `components/workspace/StatusBar.tsx`

- [ ] **Step 1: Create hook**

```ts
export function useWorkspaceShortcuts(opts: {
  document: WorkspaceDocument;
  activeTool: WorkspaceTool;
  onToolChange: (t: WorkspaceTool) => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); opts.onUndo(); return; }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) { e.preventDefault(); opts.onRedo(); return; }
      const tool = toolFromKeyboard(e.key);
      if (tool && isToolEnabled(tool, opts.document)) opts.onToolChange(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [opts]);
}
```

- [ ] **Step 2: Wire StatusBar** with live `pathCount` (`countPaths(svgString)`), `byteSize` (`svgByteSize`), zoom % from `zoomViewport.scale`.

- [ ] **Step 3: Commit**

```bash
git add hooks/useWorkspaceShortcuts.ts components/workspace/Workspace.tsx components/workspace/StatusBar.tsx
git commit -m "feat(workspace): add keyboard shortcuts and live status bar"
```

---

### Task 13: Remove wizard, migrate AppShell icons, final polish

**Files:**
- Delete: `components/shared/StepIndicator.tsx`
- Delete: `components/upload/UploadStep.tsx`
- Delete: `components/vectorize/VectorizeStep.tsx`
- Delete: `components/colors/ColorEditStep.tsx`
- Delete: `components/shape/ShapeEditStep.tsx`
- Delete: `components/labels/LabelStep.tsx`
- Modify: `components/shared/AppShell.tsx` (Phosphor for theme/lang; slim header or merge into TopBar)
- Modify: `app/globals.css` (workspace panel tokens if needed)

- [ ] **Step 1: Delete obsolete step components** after confirming no imports remain.

- [ ] **Step 2: Simplify AppShell** — header can be minimal (footer only) since TopBar carries brand + toggles. Move `ThemeToggle`/`LangToggle` to use Phosphor icons.

- [ ] **Step 3: Run full verification**

```bash
npm test
npm run type-check
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 4: Manual test checklist**
- Empty state shows dropzone only
- Upload → auto vectorize → lands on Select tool
- All 11 toolbar tools clickable when enabled
- Undo/redo works after color change
- Download produces valid SVG
- Dark mode + ES/EN toggles work
- Tooltips appear after ~400 ms hover

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(workspace): remove wizard steps and finalize editor shell"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Photoshop layout (toolbar/canvas/inspector) | Task 4 |
| No landing, dropzone empty state | Task 5 |
| Phosphor icons | Task 1–3 |
| All tools always visible | Task 3 |
| Tool tooltips with shortcuts | Task 2 |
| Vectorize auto-revectorize | Task 6 |
| Read-only palette in vectorize | Task 6 |
| Select color editing | Task 8 |
| Eyedropper + Fill | Task 9 |
| Erase/Brush/Nodes | Task 10 |
| Labels | Task 11 |
| Optimize (clean + max) | Task 11 |
| Zoom inspector | Task 11 |
| Undo/redo top bar | Task 7, 12 |
| Download always visible | Task 4 |
| Keyboard shortcuts | Task 12 |
| Remove wizard | Task 13 |
| i18n keys | Task 3, 4, 11 |
| ErrorBoundary | Task 4 |
| `isToolEnabled` tests | Task 1 |

## Optional follow-up (out of v1 scope)

- `/impeccable init` + `/impeccable document` for `PRODUCT.md` / `DESIGN.md`
- Unified undo stack across all tools
- Session persistence (localStorage)
