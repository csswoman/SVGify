# SVGify Violet Brand Reskin — Design Spec

Date: 2026-08-21

## Goal

SVGify's current UI is visually indistinguishable from default shadcn dark mode (blue-500 on slate). This work replaces the palette, type system, and mark with a violet-tinted identity, tightens the three-column layout so the canvas reads as primary, and rewrites copy so the tool's real differentiator (on-device, private, free) is visible in the header instead of buried in the footer.

This is a visual + copy layer only. `src/core` / vectorization pipeline, canvas colors (user's own image/shape colors), the checkerboard transparency pattern, and existing keyboard shortcuts are untouched.

## Source of truth

The full token values, type scale, mark description, layout spec, copy table, and component details are authored by the user and reproduced in full below — this document packages them into an actionable spec plus the codebase-specific decisions needed to implement them.

## 1. Palette

Full replacement of the blue accent system. No `#3b82f6`, `blue-500`, or `blue-600` may remain anywhere in `app/`, `components/`, `lib/`, `hooks/`.

| Name | Hex | Use |
|---|---|---|
| Violet Ink | `#1A1030` | Primary text in light, dark-mode surface base |
| Violet | `#6A28E0` | Primary accent (light mode) |
| Violet Glow | `#9B6BFF` | Accent on dark surfaces |
| Paper | `#FAF9FC` | Light background |
| Mist | `#E7E3F0` | Light borders |
| Signal Mint | `#00A578` | Ready state / privacy badge |

Neutrals carry a deliberate violet tint — not Tailwind's blue-grays.

### Tokens

```css
:root {
  --bg:              #FAF9FC;
  --surface:         #FFFFFF;
  --surface-sunken:  #F2F0F7;
  --border:          #E7E3F0;
  --border-strong:   #D3CCE4;

  --text:            #1A1030;
  --text-secondary:  #5A5170;
  --text-muted:      #8A83A0;

  --accent:          #6A28E0;
  --accent-hover:    #5A1FC7;
  --accent-solid:    #6A28E0;  /* button fills */
  --accent-on:       #FFFFFF; /* text on accent-solid */
  --accent-soft:     #F1EAFE; /* selected item background */
  --accent-ring:     #6A28E033;

  --success:         #00A578;
  --success-soft:    #E3F8F1;

  --radius:          10px;
  --radius-sm:       6px;
}

.dark {
  --bg:              #100B1C;
  --surface:         #171029;
  --surface-sunken:  #0B0715;
  --border:          #2A2040;
  --border-strong:   #3B2F57;

  --text:            #F3F0FA;
  --text-secondary:  #A79CC4;
  --text-muted:      #6F6690;

  --accent:          #9B6BFF;   /* text, icons, borders, slider fills */
  --accent-hover:    #B38FFF;
  --accent-solid:    #7B3FF2;   /* button fills, carries white text */
  --accent-on:       #FFFFFF;
  --accent-soft:     #241640;
  --accent-ring:     #9B6BFF40;

  --success:         #2ED9A8;
  --success-soft:    #0E2B24;
}
```

**Contrast note:** in dark mode, `--accent` (`#9B6BFF`) is too light to carry white text. `--accent` is for strokes/text/icons; `--accent-solid` is for fills. Do not swap them.

**Selector note:** the brief's source markup uses `[data-theme="dark"]`; this codebase's existing theme mechanism uses a `.dark` class on `<html>` (`useTheme` hook + localStorage, see `app/layout.tsx`). The implementation uses `.dark` — same tokens, existing mechanism, no new theming system introduced.

### Codebase migration

`app/globals.css` already defines a `--color-*` custom-property layer wired into Tailwind via `@theme inline`, partially consumed as token utility classes (`bg-surface`, `text-ink-muted`, `border-border`) and partially bypassed by components that hardcode raw Tailwind grays/blues directly (`bg-white`, `border-gray-200`, `text-gray-600`, `bg-blue-600`, `border-action-blue`, etc.).

This pass:
- Renames/repoints the `--color-*` tokens in `app/globals.css` to the values above (keeping the existing naming convention: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, etc., adjusted from the current `ink`/`canvas-bg`/`action-blue` names to match this system, OR kept as close to current names as practical to minimize churn — final naming decided during implementation, values are non-negotiable).
- Migrates every component currently hardcoding raw Tailwind gray/blue/green utilities (`TopBar.tsx`, `ToolBar.tsx`, `ToolButton.tsx`, `ImageComparisonSlider.tsx`, `ImageDropzone.tsx`, `NodeEditor.tsx`, `PathList.tsx`, `LabelSidebar.tsx`, `LabelInput.tsx`, inspectors, `CanvasOverlay.tsx`, `LoadingState.tsx`, `lib/sampleImage.ts` if it emits UI-facing markup) to the token classes, so both themes are driven from one set of CSS variables and no second hardcoded palette can drift back in.
- `.btn-secondary`, `.btn-secondary-sm`, `.focus-ring`, `.btn-primary`, `.btn-tertiary` in `globals.css` currently reference `blue-600`/`blue-200`/`blue-50`/etc. directly — rewritten to reference the new tokens.
- Danger tokens (`--color-danger-*`) are untouched — out of scope, not part of the brief.

Acceptance: `grep -ri "3b82f6\|blue-500\|blue-600" app/ components/ lib/ hooks/` returns nothing.

## 2. Typography

Three families, each with one job. Anything that doesn't clearly fit Display or Data goes in UI (Inter).

| Role | Family | Where |
|---|---|---|
| Display | Space Grotesk 700, `letter-spacing: -0.03em` | Wordmark, empty-state headline. Nowhere else. |
| UI | Inter 400/500/600 | All interface text, labels, buttons, help copy |
| Data | JetBrains Mono 400/500 | See mono rule below |

### The mono rule

Mono is for every number the tool produced or the user adjusted, plus keyboard shortcuts:
- File size / shape count / color count / percentages: `39.9 KB`, `70 shapes`, `9 colors`, `100%`
- Slider ticks: `4 8 16 32 64 128`
- Setting values (number in mono, label in Inter): `Colors: 16`, `Tolerance: 48`
- Left-rail keyboard hints: `G I A B E X`
- Hex codes in the color picker

Not mono: prose, descriptions, button text, section titles.

### Scale

```
display   28px / 1.1  / Space Grotesk 700 / -0.03em
h-panel   15px / 1.3  / Inter 600
eyebrow   11px / 1    / Inter 600 / uppercase / 0.08em
body      13px / 1.5  / Inter 400
label     13px / 1.4  / Inter 500
data      12px / 1    / JetBrains Mono 500 / -0.01em
hint      11px / 1.4  / Inter 400 / --text-muted
```

### Loading

Replace `next/font/google` Geist Sans / Geist Mono (`app/layout.tsx`) with `next/font/google` Space Grotesk, Inter, and JetBrains Mono — self-hosted at build time, latin subset, `display: 'swap'`, only the weights listed above (Space Grotesk 700 only; Inter 400/500/600; JetBrains Mono 400/500). Exposed as CSS variables (`--font-space-grotesk`, `--font-inter`, `--font-jetbrains-mono`) and wired into `@theme inline` in `globals.css` (`--font-sans`, `--font-mono`, plus a new `--font-display`).

Acceptance: combined font weight total < 200 KB; every generated number renders in JetBrains Mono.

## 3. The mark

Current mark (a plain square) communicates nothing. New mark: an anchor point with two bezier handles — filled square at center, two diagonal lines to opposite corners, small hollow circle at each line end. This is the universal "vector" symbol to anyone who has touched Illustrator or Figma.

SVG spec: `stroke="currentColor"`, `stroke-width="1.5"`, hollow circles `fill="none"`, viewBox sized for 24×24 rendering in the header, no background box.

Appears in exactly three places, nowhere else:
1. **Header logo** — replaces the current square mark in `TopBar.tsx` (currently an `<img src="/svgify-transparent.svg">` in a dark rounded box — box is removed, icon rendered directly at 24×24 in `currentColor`).
2. **Split-view handle** — `ImageComparisonSlider.tsx` currently renders a circle with `ArrowsLeftRightIcon`; replaced with the anchor-point mark, oriented so the two handle-lines point left/right along the slider axis.
3. **Active-tool indicator in the left rail** — `ToolButton.tsx` currently marks the active tool with a filled background (`bg-action-blue-surface` + border). This is replaced with a small anchor-point glyph in `--accent`, positioned to the left of the active item, rather than a filled background. (Exact background/border treatment for the active state beyond the indicator itself — e.g. whether a subtle background remains — is an implementation detail resolved during execution, but the *filled colored background as primary active signal* is replaced by the mark.)

A new `components/shared/AnchorPointIcon.tsx` (or similar) is created once and reused in all three places rather than duplicating inline SVG markup.

## 4. Layout

Three columns currently compete with none reading as primary.

### Left rail → 64px icon-only, unconditionally

Today `ToolBar.tsx` renders two different DOM structures: a 64px icon-only `<nav>` for `<lg` viewports, and an entirely separate 256px labeled `<nav>` (`hidden lg:flex lg:w-64`) with section headings, row-mode buttons, and a hint paragraph, for `≥lg`. The spec collapses this to one 64px icon-only rail at all breakpoints:

- Delete the `lg:flex w-64` desktop branch entirely (including its `desktopHint` / `renderDesktopTool` row-mode markup and the instructional paragraph — see Copy section, this text is deleted, not moved).
- The remaining icon-only rail becomes the only rail, all breakpoints.
- Existing hover tooltips (`ToolTooltip.tsx`, already used in icon mode) become the sole way to see a tool's name + shortcut — confirm they already fire on `≥lg` hover, not just touch, since previously that surface was only reachable on narrow viewports.
- Section dividers between tool groups (File / Color / Refine shapes / Output) stay as unlabeled 1px dividers — this already exists in the icon rail (`h-px w-8 bg-gray-200` between groups); just retokenize the color.
- Net effect: recovers ~180px of canvas width on desktop, and removes the now-redundant instructional paragraph that duplicated the right panel.

### Right inspector — already contextual, needs copy pass only

`InspectorHeader.tsx` already takes `title`/`subtitle` props set per active tool by each `inspectors/*Inspector.tsx` — the "header reflects active tool" requirement is structurally satisfied. This pass only updates the copy strings passed in (see Copy section) and retokenizes colors.

### Status bar — single mono telemetry line

`StatusBar.tsx` already centers on a metrics span (`{pathCount} paths · {byteSize}`) using `font-mono tabular-nums` and already token-classed (`bg-surface`, `text-ink-muted`). Changes:
- Confirm layout matches "telemetry left-aligned, zoom/background controls right, no box borders between sections" — largely already true; verify no stray dividers were added since and retokenize colors only.
- Metrics format updates to match new copy (see below): `70 shapes · 39.9 KB · 9 colors` — colors count needs to be threaded in if not already present as a prop.

## 5. Copy

String-for-string replacement table.

### Header
| Current | New |
|---|---|
| "SVGify" / "Vectorize on your device" tagline | "SVGify" + separate badge (below) |
| "Editable SVG" label (`workspace.editableSvg`) | Removed — orphaned label, does nothing |
| "Download without preparing" | "Download raw SVG" — ghost style, not primary button. Tooltip: "Skips cleanup. Larger file." |

New badge in header, right of wordmark: 6px dot in `--success` + "On-device · nothing uploaded" in Inter 500 11px, inside a pill with `--success-soft` background. This is the tool's real differentiator against paid competitors — currently buried in the footer at 12px gray; it moves to the header.

### Right panel
| Current | New |
|---|---|
| "Vectorize" / "Adjust until the SVG looks right." | "Vectorize" / "Changes re-run automatically." |
| "Mode" | "Image type" |
| Detail: Clean / Balanced / More detail | Detail: Simple / Balanced / Detailed |
| "Tolerance: 48" | "Background tolerance: 48" + hint "Higher removes more of the background." |
| "More settings" / Photo smoothing, corners, edge cleanup | unchanged |
| "Palette" / "9 colors · Balanced" | unchanged |

### Status bar
| Current | New |
|---|---|
| "SVG ready — prepare to download" | "Ready to optimize" |
| "Cleans the palette and compacts shapes so the download is smaller and ready to ship." | "Merges duplicate colors and simplifies paths. Usually cuts the file size in half." |
| "Prepare for download" | "Optimize & download" |
| "Edit colors first" (with `G` badge) | "Edit colors first" as text link, shortcut `G` in muted mono |

### Footer
| Current | New |
|---|---|
| "MIT · Your images never leave your device · Source on GitHub" | "MIT licensed · Source on GitHub" |

Privacy line moved to header badge — not repeated in footer.

### Empty state (new — none exists today)

First screen every visitor sees; also used in the README.

- Headline (Space Grotesk 28px): "Turn any image into an editable SVG."
- Sub (Inter 13px, `--text-secondary`): "Runs entirely in your browser. Nothing is uploaded, nothing is stored."
- Dropzone: subtle checkerboard background, dashed `--border-strong` border, `--accent` on drag-over. Text: "Drop an image, or browse"
- Hint (mono 11px, `--text-muted`): "PNG · JPG · WEBP · up to 10 MB"

Checkerboard as dropzone texture reuses the existing canvas transparency pattern (`.transparent-preview` in `globals.css`) — free identity, already reads as "image tool with transparency."

Implementation note: need to confirm current empty-state markup (`components/upload/ImageDropzone.tsx` and wherever it's rendered pre-upload) — likely needs new headline/sub copy inserted above the existing dropzone rather than the dropzone being built from scratch.

## 6. Component details

- **Sliders**: 4px track in `--border`, fill in `--accent`, 14px thumb — `--surface` fill, 2px `--accent` border, soft shadow. No solid-filled thumbs.
- **Segmented controls** (Mode/Image type, Detail): container `--surface-sunken`, active item `--surface` + 1px shadow, active text `--text`, inactive `--text-muted`. Do not use `--accent-soft` here in light mode — oversaturates the panel.
- **Checkbox**: `--accent-solid` when checked, white check.
- **Focus visible**: `outline: 2px solid var(--accent); outline-offset: 2px` — mandatory on every interactive element (keyboard-shortcut-heavy tool; keyboard nav must be first-class). `.focus-ring` utility in `globals.css` already exists and is broadly applied — retokenize its `ring-blue-600` to `--accent` rather than rebuilding it.
- **Radius**: `--radius` (10px) on panels/buttons, `--radius-sm` (6px) on small controls — consistent with existing `rounded-lg`/`rounded-md` usage; confirm mapping.

## 7. Out of scope (explicitly not touched)

- Vectorization logic / image pipeline (`src/core` or equivalent, the worker/API pipeline)
- Canvas colors — these belong to the user's image/shapes
- The checkerboard pattern itself (reused, not redesigned)
- Existing keyboard shortcuts
- Feature structure/behavior — visual layer and copy only

## 8. Acceptance criteria

- [ ] `grep -ri "3b82f6\|blue-500\|blue-600" app/ components/ lib/ hooks/` returns nothing
- [ ] Light and dark share the same token names; only values differ
- [ ] Space Grotesk, Inter, JetBrains Mono load via `next/font/google` with `display: 'swap'`, latin subset; combined weight < 200 KB
- [ ] Every tool-generated number renders in JetBrains Mono
- [ ] `prefers-reduced-motion` respected in any new/changed transition
- [ ] The anchor-point mark appears in exactly 3 places (header logo, split-view handle, active-tool indicator) and nowhere else
- [ ] All text passes 4.5:1 contrast against its background (7:1 for `--text` on `--surface`)
- [ ] Responsive: below 900px the right inspector collapses to a bottom sheet; left rail stays fixed at 64px
- [ ] Screenshots taken of empty state and loaded state, both themes, before calling this done
- [ ] `DESIGN.md` rewritten to reflect the new system (it's referenced directly by a comment in `globals.css` as the source of truth and will otherwise go stale immediately)

## Suggested work order

1. CSS tokens + purge blue (biggest change, lowest risk)
2. Fonts + mono rule application
3. New mark + its 3 usages
4. Copy pass (table above, string by string)
5. Left rail → 64px unconditional + status bar telemetry line
6. Empty state
7. Screenshots + self-critique against acceptance criteria
8. `DESIGN.md` rewrite
