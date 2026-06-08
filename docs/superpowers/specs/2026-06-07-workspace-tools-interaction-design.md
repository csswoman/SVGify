# Workspace Tools — Unified Interaction Design

**Date:** 2026-06-07  
**Status:** Approved (brainstorming)

## Summary

Fix inconsistent canvas tool behavior by introducing a single delegated click handler (`useCanvasToolInteraction`), removing the redundant **Select** tool, and redistributing palette bulk actions to **Optimize**. Six editing tools (Eyedropper, Fill, Erase, Brush, Nodes, Labels) get predictable cursors, clicks, and inspector panels.

## Problem

Tools appear in the toolbar but do not behave reliably on the canvas (A). Behavior is inconsistent across tools (G) because three competing click systems exist today:

1. React `onClick` on the canvas container (`Canvas.handleSvgClick`) for select/eyedropper/fill
2. Native `addEventListener('click')` on each path in `useWorkspaceShapeTools` (erase/nodes)
3. Native `addEventListener('click')` on each path in `useWorkspaceLabels` (labels)

Eyedropper shares select's click logic but has a minimal inspector. Select holds the full palette editor, making it redundant with eyedropper while blocking a clear mental model.

## Goals

- One predictable click path for all path-targeting tools
- Remove **Select** from toolbar and types
- Eyedropper picks color; Fill paints; bulk palette actions live in Optimize
- Default tool after vectorization: **Eyedropper**
- Preserve brush stroke overlay and node handle overlay patterns

## Non-goals

- Move/transform tool
- Brush fill mode (stroke-only brush stays)
- Vectorization engine changes
- Cross-session persistence

## Decisions (from brainstorming)

| Question | Answer |
|---|---|
| Problem type | Tools in toolbar don't behave as expected |
| Worst offenders | Eyedropper + general inconsistency |
| Select tool | Remove; split responsibilities |
| Palette bulk actions | Move to Optimize inspector |
| Architecture | Approach 1: unified interaction hook |

## Toolbar

### Remove

- **Select** (`select`, shortcut `V`, `Cursor` icon)
- `SelectInspector.tsx`

### Keep (post-vectorization edit tools)

| Tool | Shortcut | Canvas role | Inspector |
|---|---|---|---|
| Eyedropper | I | Pick path `fill` | Picked color, hex, picker, "Use as fill" |
| Fill | G | Replace all paths matching clicked color | Active fill ColorPicker |
| Erase | E | Delete path on click | Path list + hover highlight |
| Brush | B | Freehand stroke overlay | Color + size |
| Nodes | A | Select path for node editing | Hint + deselect |
| Labels | L | Assign/edit path label | Label list + input |
| Optimize | — | No canvas interaction | Palette section + optimize section |
| Zoom | Z | Pan only (Space/Alt/middle button) | Zoom + preview background |

### Default after vectorize

Change `handleSvgReady` from `'select'` to `'eyedropper'`.

## Canvas behavior

### Unified interaction hook

**New file:** `hooks/useCanvasToolInteraction.ts`

Single delegated `click` (and `mousemove` for erase hover) on the SVG container. Resolves target via `event.target.closest('path')`. No other hook attaches native click listeners to paths.

**Exceptions (React portals, own pointer capture):**

- `BrushEditor` — transparent rect captures pointer for drawing
- `NodeEditor` — handle drag; background click deselects via unified handler

### Per-tool rules

| Tool | Cursor | Click path | Click background |
|---|---|---|---|
| Eyedropper | `crosshair` | Set `selectedColor`; highlight all paths with same fill | Clear `selectedColor` |
| Fill | `cell` | `replaceColor(clicked, fillColor)` + snapshot if changed | No-op |
| Erase | `pointer` | Remove path + snapshot + refresh path list | No-op |
| Brush | `crosshair` | Draw via overlay | Draw via overlay |
| Nodes | `pointer` | Set `selectedPath` | Clear `selectedPath` |
| Labels | `crosshair` | Set `editingLabelPath`, open LabelInput | Cancel label edit |
| Optimize | `default` | No-op | No-op |
| Zoom | `grab` when scale > 1 | No-op | Pan via Space/Alt/middle only |

### Zoom/pan (unchanged)

- Pan: Space + drag, Alt + drag, or middle mouse button
- Left click never starts pan
- Tools work at any zoom level

### Eyedropper → Fill flow

1. Eyedropper: click path picks color
2. Inspector button **"Use as fill"** copies to `fillColor`, switches tool to Fill
3. Shortcut `G` opens Fill with last active `fillColor`

### Visual feedback

- Erase hover: opacity 0.4 on path under cursor (from unified mousemove)
- Eyedropper with picked color: subtle outline on all paths matching that fill
- Nodes with selected path: subtle outline on active path

## Architecture

### Data flow

```
Workspace (activeTool, selectedColor, fillColor)
    │
    ├── Canvas
    │     ├── useCanvasToolInteraction   ← sole path click handler
    │     ├── BrushEditor portal
    │     └── NodeEditor portal
    │
    └── Inspector (per activeTool)
          ├── EyedropperInspector (new)
          ├── FillInspector
          ├── EraseInspector
          ├── BrushInspector
          ├── NodesInspector
          ├── LabelsInspector
          └── OptimizeInspector (+ palette)
```

### File changes

| File | Change |
|---|---|
| `hooks/useCanvasToolInteraction.ts` | **Create** — unified click/hover/cursor |
| `hooks/useCanvasToolInteraction.test.ts` | **Create** — per-tool behavior tests |
| `hooks/useWorkspaceShapeTools.ts` | Remove path click listeners; keep state |
| `hooks/useWorkspaceLabels.ts` | Remove path click listeners; keep label state |
| `components/workspace/Canvas.tsx` | Use unified hook; remove inline handler |
| `components/workspace/inspectors/EyedropperInspector.tsx` | **Create** |
| `components/workspace/inspectors/SelectInspector.tsx` | **Delete** |
| `components/workspace/inspectors/OptimizeInspector.tsx` | Add palette section from SelectInspector |
| `components/workspace/Inspector.tsx` | Wire EyedropperInspector; remove Select |
| `types/workspace.types.ts` | Remove `'select'` |
| `lib/workspaceTools.ts` | Remove select from groups and KEY_MAP |
| `lib/workspaceTools.test.ts` | Update shortcuts (no `v`) |
| `components/workspace/ToolBar.tsx` | Remove select icon |
| `components/workspace/Workspace.tsx` | Default tool → eyedropper |
| `lib/i18n.tsx` | New keys; remove `tool.select`; update hints |

### Palette migration (SelectInspector → OptimizeInspector)

Move to Optimize **Palette** section:

- Color swatches (click to select for actions)
- Reduce-to-N slider + Normalize button
- Snap darks to black
- Delete color from SVG (swatch ×)
- Collapsible original palette (reapply)

Keep in Optimize **Optimization** section:

- Clean fragments
- Max optimize
- Path/byte stats

## Inspector details

### EyedropperInspector (new)

- Large swatch (empty state with hint)
- Hex value (mono)
- ColorPicker when color picked (editing picked color replaces all paths with that fill)
- Button "Use as fill" → `fillColor` + switch to Fill tool

### FillInspector

- ColorPicker for active fill color
- Hint: click path to replace all matching fills

### OptimizeInspector (expanded)

Two collapsible sections, palette first:

1. **Palette** — bulk color operations (migrated from Select)
2. **Optimization** — existing clean/max buttons + stats

## Edge cases

| Case | Behavior |
|---|---|
| Path without parseable `fill` | Ignore click; brief status hint |
| Fill same color | No-op, no undo snapshot |
| Delete last path | Allowed; empty canvas message in inspector |
| Tool switch with node selected | Auto-deselect path |
| Escape | Deselect node / cancel label edit / clear eyedropper pick |
| Undo/redo | One snapshot per mutating action |

## i18n

Remove: `tool.select`

Add:

- `col.eyedropperHint` — click path to pick color
- `col.useAsFill` — use picked color as fill
- `optimize.paletteSection` — palette section label
- `optimize.optimizeSection` — optimization section label

Update: `col.subtitle` for eyedropper context (no "select" wording)

## Accessibility

- CSS cursor per tool on canvas container
- `aria-live="polite"` on status bar when picking or filling color
- Keyboard shortcuts: `I` eyedropper, `G` fill (remove `V`)

## Success criteria

1. Eyedropper: path click → color visible in inspector immediately
2. Fill: path click replaces **all** paths with matching fill
3. Erase: path click deletes; list updates instantly
4. Brush: stroke visible and persists after pointer up
5. Nodes: path click selects; handles draggable; background deselects
6. Labels: path click opens input; save writes `data-label`
7. No tool interferes with another when switching modes
8. Optimize contains all bulk palette actions formerly in Select

## Testing

- Unit tests for `useCanvasToolInteraction` (mock SVG, table-driven per tool)
- Update `workspaceTools.test.ts` (no select, no `v` mapping)
- Manual: full flow upload → vectorize → each tool → undo → download
