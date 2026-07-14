# SVGcraft Home — Workspace Redesign

**Date:** 2026-06-07  
**Status:** Approved

## Summary

Replace the current 5-step wizard home with a single **Photoshop-style workspace** optimized for **flat icon/logo** workflows. No marketing landing: opening the app shows an empty-canvas dropzone. All tools (including advanced ones) stay **always visible** in a left vertical toolbar with **Phosphor** icons and hover tooltips.

## Goals

- Reduce cognitive load for the primary flow: upload → tune vectorization → recolor → download.
- Eliminate duplicated surfaces (palette in Vectorize + Colors, erase in Colors + Shape).
- Feel like a professional editing tool, not a multi-page form wizard.
- Preserve the privacy guarantee and 100% client-side processing.

## Non-goals

- Marketing landing page or onboarding carousel.
- Server-side features, auth, or project persistence across sessions (v1).
- Replacing the vectorization engine (imagetracerjs stays).

## User persona

**Icon/logo designers and developers** who need a clean, lightweight SVG from a flat PNG. They expect familiar tool affordances (toolbar, canvas, inspector) and fast iteration—not a tutorial.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ SVGcraft    [↩][↪]              [⬇ SVG]        theme  lang │  top bar
├────┬────────────────────────────────────────────┬────────────┤
│ T  │                                            │ Inspector  │
│ O  │              CANVAS                        │ (context   │
│ O  │    dropzone · split preview · SVG edit     │  of active │
│ L  │                                            │  tool)     │
│ B  │                                            │            │
│ A  │                                            │            │
│ R  │                                            │            │
├────┴────────────────────────────────────────────┴────────────┤
│ paths · file size · zoom % · active tool hint · shortcuts    │  status bar
└─────────────────────────────────────────────────────────────┘
```

### Empty state (no image)

- Canvas area shows centered **dropzone** (same validation as today: MIME + magic bytes, ≤10 MB).
- Toolbar: only **Import** is enabled; other tools disabled until an image is loaded.
- No hero text or landing sections—just dropzone + one-line privacy note below.

### With image loaded

- Default active tool after first auto-vectorize: **Select** (color editing).
- Canvas and zoom viewport persist across tool switches (reuse existing `SvgZoomViewport` state).
- **Download SVG** always visible in top bar.

## Toolbar

Vertical strip, **40×40 px** hit targets, grouped by separators. Tooltips appear to the **right** on hover (tool name + keyboard shortcut). Active tool: tinted background + accent border; use Phosphor `weight="fill"` for active icon, `weight="regular"` for inactive.

### Tool groups (always visible)

| Group | Tool | Phosphor icon | Shortcut | Enabled when |
|---|---|---|---|---|
| File | Import / replace | `ImageSquare` | — | always |
| Vectorize | Vectorize settings | `MagicWand` | — | `imageData` present |
| Edit | Select path | `Cursor` | V | `svgString` present |
| Edit | Eyedropper | `Eyedropper` | I | `svgString` present |
| Edit | Fill by color | `PaintBucket` | G | `svgString` present |
| Edit | Erase path | `Eraser` | E | `svgString` present |
| Pro | Vector brush | `PaintBrush` | B | `svgString` present |
| Pro | Move nodes | `PenNib` | A | `svgString` present |
| Pro | Label paths | `Tag` | L | `svgString` present |
| Output | Optimize | `Lightning` | — | `svgString` present |
| View | Zoom / pan | `MagnifyingGlass` | Z | `svgString` present |

Undo/redo live in the **top bar** (not toolbar): `ArrowCounterClockwise` / `ArrowClockwise`, shortcuts Ctrl+Z / Ctrl+Shift+Z. History is per editing session on the mounted SVG (reuse existing undo stacks from ColorEditStep and ShapeEditStep, unified at workspace level).

### Tooltip component

Replace the current `?` button pattern for toolbar tools with **native-style tooltips**:

- Delay ~400 ms on hover.
- Dark panel, single line title + optional second line for shortcut.
- `aria-label` on each tool button for keyboard/screen reader users.
- Keep existing `Tooltip` (? help) only inside inspector panels for complex sliders.

## Inspector panels (right column)

Context changes with active tool. Width ~280–320 px, scrollable.

| Active tool | Inspector contents |
|---|---|
| **Import** | Format hints, privacy line, replace-image button |
| **Vectorize** | Icon-oriented presets/chips, color count, blur, noise, precision; collapsible advanced; background removal (toggle, tolerance, contiguous, seed picks); **read-only** suggested palette preview (no duplicate editable palette); auto-revectorize note |
| **Select** | Color swatches, color picker, merge/normalize/reduce actions, before/after toggle |
| **Eyedropper** | Picked color preview + “apply to selection” |
| **Fill** | Active fill color + click hint |
| **Erase** | Path list (from ShapeEditStep), delete hint |
| **Brush** | Color + size sliders |
| **Nodes** | Usage hint; deselect control |
| **Labels** | Label sidebar + input (from LabelStep) |
| **Optimize** | Clean fragments, optimize-to-max (with existing help text), byte/path stats |
| **Zoom** | Zoom %, fit/100%, checkerboard/black preview background |

## Features: keep, move, remove

### Keep

- Upload validation and drag-and-drop.
- Auto-revectorize on settings change (debounced).
- Background removal (auto corners + click seeds).
- Color editing (swatch + path click, undo/redo).
- Shape tools: nodes, brush, erase + path list.
- Path labeling.
- Clean fragments + max optimize.
- Zoom/pan with persisted viewport.
- Download SVG.
- i18n (EN/ES), dark mode, ErrorBoundary.
- Client-side privacy messaging.

### Remove from primary flow

- 5-step wizard and `StepIndicator`.
- Per-step “Continue to … →” buttons.
- Bottom “← Back” link.
- Editable palette in vectorize step (inspector shows preview only; editing happens in Select tool).
- Manual “Re-vectorize now” button (auto-update remains).
- Emoji-based tool labels (🖌, ✥, etc.).

### Consolidate

- Single **Erase** tool (drop erase mode from old Color step as separate concept).
- Single **palette editing** surface (Select tool inspector).
- **Optimize** groups clean + max-compress.

## Visual design

- **Icon library:** `@phosphor-icons/react` (user choice). Single dependency; header theme/lang toggles also use Phosphor (`Moon`, `Sun`, `Globe`).
- **Chrome:** neutral gray workspace background (similar to Figma/Photoshop), white/dark-800 panels, subtle borders—not the current single centered card.
- **Canvas:** checkerboard transparent preview (reuse `.transparent-preview` / shape step backgrounds).
- **Typography:** keep Geist; status bar and inspector labels at 12–13 px; tool tooltips 11 px.
- **Accent:** one primary accent for active tool (recommend retaining blue-600 or refining via `/impeccable colorize` in implementation).
- Run `/impeccable init` + `/impeccable document` before visual implementation to produce `PRODUCT.md` and `DESIGN.md` tokens.

## Architecture

### New components

```
/components/workspace/
  Workspace.tsx           # top-level layout shell, tool + document state
  ToolBar.tsx             # vertical tool strip
  ToolButton.tsx          # 40×40 button + Phosphor icon + tooltip
  TopBar.tsx              # undo/redo, download, branding, theme/lang
  StatusBar.tsx           # paths, bytes, zoom, hints
  Inspector.tsx           # routes to panel by active tool
  Canvas.tsx              # dropzone | split preview | zoomable SVG mount
  inspectors/
    ImportInspector.tsx
    VectorizeInspector.tsx
    SelectInspector.tsx
    EyedropperInspector.tsx
    FillInspector.tsx
    EraseInspector.tsx
    BrushInspector.tsx
    NodesInspector.tsx
    LabelsInspector.tsx
    OptimizeInspector.tsx
    ZoomInspector.tsx
```

### Refactor existing steps

- Lift logic from `VectorizeStep`, `ColorEditStep`, `ShapeEditStep`, `LabelStep` into inspector + canvas modules.
- Delete or deprecate step components once parity is reached.
- `page.tsx` renders only `<Workspace />`.

### State (workspace level)

```ts
type WorkspaceTool =
  | 'import' | 'vectorize' | 'select' | 'eyedropper' | 'fill'
  | 'erase' | 'brush' | 'nodes' | 'labels' | 'optimize' | 'zoom';

interface WorkspaceState {
  activeTool: WorkspaceTool;
  imageData: ImageData | null;
  svgString: string | null;
  zoomViewport: SvgZoomViewport;
  // v1: one undo stack per tool category (edit vs vectorize); merge into a single stack in a follow-up
}
```

Tool switching does not clear `imageData` or `svgString`. Importing a new image resets SVG and sets active tool to `vectorize`.

## Data flow

1. User drops image → `imageData` set → auto-vectorize with icon defaults → `svgString` set → `activeTool = 'select'`.
2. Vectorize tool: inspector changes update settings → debounced re-vectorize → canvas split view updates.
3. Edit tools: mount sanitized SVG in canvas (existing sanitize + DOM mount pattern); mutations update `svgString` and undo stack.
4. Download: serialize current mounted SVG from any tool.

## Error handling

- Validation errors on import: inline alert in canvas/inspector (existing copy).
- Vectorize worker errors: alert banner above canvas; tools stay on vectorize.
- SVG mount failures: ErrorBoundary around canvas only; toolbar remains usable to re-import.
- No raw stack traces in UI.

## Accessibility

- Toolbar: `role="toolbar"`, roving `tabIndex` or arrow-key navigation between tools.
- Each `ToolButton`: `aria-pressed` when active, `aria-disabled` when unavailable.
- Keyboard shortcuts listed in status bar when a tool is active.
- Inspector controls retain labels and `aria-label` on sliders.

## i18n

- Add keys under `tool.*`, `workspace.*`, `inspector.*` namespaces.
- Migrate hardcoded `StepIndicator` English strings (removed with wizard).

## Testing

- Unit: tool enabled/disabled rules from workspace state.
- Unit: keyboard shortcut → `activeTool` mapping.
- Integration: upload → vectorize → select color → download produces valid SVG.
- Visual/manual: toolbar active states, tooltip delay, dark mode contrast.

## Migration notes

- `AppShell` main area becomes full-height workspace (`min-h` flex); reduce outer padding.
- `max-w-6xl` constraint may widen to `max-w-[100%]` or `max-w-7xl` for canvas breathing room.
- Existing tests for `iconVectorization`, `paletteExtraction`, etc. unchanged—only UI shell changes.

## Dependencies

- Add: `@phosphor-icons/react`

## Decisions locked with user

- Primary use case: flat icons/logos.
- No landing page—tool-first empty canvas.
- Layout: Photoshop-style workspace (toolbar left, canvas center, inspector right).
- All tools always visible in toolbar (including Pro tools).
- Icon library: Phosphor (`@phosphor-icons/react`).
- Impeccable skills installed at `.cursor/skills/impeccable/` for design polish during implementation.
