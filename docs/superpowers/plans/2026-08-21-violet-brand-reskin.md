# Violet Brand Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SVGify's blue/slate visual identity with the violet-tinted design system specified in `docs/superpowers/specs/2026-08-21-violet-brand-reskin-design.md` — new color tokens, a 3-font type system with a strict "numbers go in mono" rule, a new anchor-point brand mark used in exactly 3 places, a collapsed 64px-always icon rail, a rewritten copy pass, and a new empty state — without touching vectorization logic, canvas colors, the checkerboard pattern, or keyboard shortcuts.

**Architecture:** This is a token-and-markup pass over an existing Next.js App Router codebase. `app/globals.css` already exposes a `--color-*` custom-property layer wired into Tailwind v4 via `@theme inline`; most work is (1) repointing those token values, (2) migrating the handful of components that bypass the token layer with raw Tailwind gray/blue classes, (3) swapping fonts in `app/layout.tsx`, (4) building one reusable `AnchorPointIcon` SVG component and using it in 3 places, (5) collapsing `ToolBar.tsx` to a single icon-only rail, (6) editing copy strings in `lib/i18n.tsx` (EN authoritative per spec, ES translated in parallel), and (7) building a new empty-state header block. No routing, state, or business-logic files change.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS v4 (`@theme inline` token layer), `next/font/google`, TypeScript, Vitest.

---

## File Structure

**Modify (tokens/CSS):**
- `app/globals.css` — repoint all `--color-*` values to the violet palette (light + `.dark`); rewrite `.btn-primary`, `.btn-secondary`, `.btn-secondary-sm`, `.btn-tertiary`, `.focus-ring` to reference new tokens instead of raw `blue-*`; add `--font-display` var.
- `app/layout.tsx` — swap Geist Sans/Mono for Space Grotesk + Inter + JetBrains Mono; retokenize `bg-gray-100`/`text-gray-900` body classes. (The existing inline theme-flash-prevention `<script>` in this file is untouched — it's pre-existing code with a hardcoded literal, not user input.)

**Modify (component color migration — hardcoded gray/blue → tokens):**
- `components/workspace/TopBar.tsx`
- `components/workspace/ToolBar.tsx` (also structural — see below)
- `components/workspace/ToolButton.tsx` (also mark — see below)
- `components/shared/ImageComparisonSlider.tsx` (also mark — see below)
- `components/shared/ToolTooltip.tsx`
- `components/upload/ImageDropzone.tsx` (also empty-state copy — see below)
- `components/shared/AppShell.tsx` (footer copy + tokens)
- `components/workspace/inspectors/VectorizeInspector.tsx`
- `components/workspace/inspectors/OptimizeInspector.tsx`

**Create:**
- `components/shared/AnchorPointIcon.tsx` — the one reusable mark SVG.
- `components/upload/EmptyStateHeader.tsx` — headline + sub copy shown above the dropzone pre-upload.

**Modify (copy):**
- `lib/i18n.tsx` — string edits per the spec's copy table, EN + ES.

**Modify (docs):**
- `DESIGN.md` — full rewrite to match the new system (referenced by a comment in `globals.css`).

**Out of scope, confirmed untouched:** anything under vectorization/worker/API pipeline logic, `hooks/useVectorizeSession.ts` internals beyond prop-only reads, keyboard shortcut definitions, canvas SVG color values, `.transparent-preview` checkerboard rule.

---

## Task 1: Color tokens — palette replacement in `globals.css`

**Files:**
- Modify: `app/globals.css:1-31` (the `@theme inline` block)

- [ ] **Step 1: Replace the token values in the `@theme inline` block**

Open `app/globals.css`. Replace lines 5-31 with:

```css
@theme inline {
  --font-sans: var(--font-inter);
  --font-display: var(--font-space-grotesk);
  --font-mono: var(--font-jetbrains-mono);

  /* SVGify design tokens (from DESIGN.md) -- violet system */
  --color-bg: #FAF9FC;
  --color-surface: #FFFFFF;
  --color-surface-sunken: #F2F0F7;
  --color-border: #E7E3F0;
  --color-border-strong: #D3CCE4;

  --color-ink: #1A1030;
  --color-ink-muted: #5A5170;
  --color-ink-subtle: #8A83A0;

  --color-accent: #6A28E0;
  --color-accent-hover: #5A1FC7;
  --color-accent-solid: #6A28E0;
  --color-accent-on: #FFFFFF;
  --color-accent-soft: #F1EAFE;
  --color-accent-ring: #6A28E033;

  --color-success: #00A578;
  --color-success-soft: #E3F8F1;

  --color-dark-bg: #100B1C;
  --color-dark-surface: #171029;
  --color-dark-surface-sunken: #0B0715;
  --color-dark-border: #2A2040;
  --color-dark-border-strong: #3B2F57;

  --color-dark-ink: #F3F0FA;
  --color-dark-ink-muted: #A79CC4;
  --color-dark-ink-subtle: #6F6690;

  --color-dark-accent: #9B6BFF;
  --color-dark-accent-hover: #B38FFF;
  --color-dark-accent-solid: #7B3FF2;
  --color-dark-accent-on: #FFFFFF;
  --color-dark-accent-soft: #241640;
  --color-dark-accent-ring: #9B6BFF40;

  --color-dark-success: #2ED9A8;
  --color-dark-success-soft: #0E2B24;

  --color-danger-surface: #fef2f2;
  --color-danger-border: #fca5a5;
  --color-danger-ink: #991b1b;
  --color-dark-danger-surface: #450a0a;
  --color-dark-danger-border: #991b1b;
  --color-dark-danger-ink: #fecaca;

  --radius-token: 10px;
  --radius-token-sm: 6px;
}
```

Notes on naming: this keeps the existing `--color-{name}` / `--color-dark-{name}` convention already used by `canvas-bg`, `ink-muted`, etc. (see `StatusBar.tsx`, which already consumes `bg-surface`, `text-ink-muted`, `border-border`, `dark:bg-dark-surface` etc.) -- so Tailwind utility classes like `bg-surface`, `text-ink`, `border-accent`, `dark:bg-dark-surface`, `dark:text-dark-accent` all keep working unchanged. `canvas-bg` is dropped since the spec has no separate canvas-background token (canvas area uses `--color-bg`/`--color-dark-bg` -- confirm in the next step that nothing else referenced `canvas-bg` before removing it).

- [ ] **Step 2: Check for remaining `canvas-bg` references before removing it**

Run: `grep -rn "canvas-bg" app/ components/ lib/ hooks/`

If any component still references `bg-canvas-bg` / `dark:bg-dark-canvas-bg` (e.g. `StatusBar.tsx`'s preview-background toggle, `OptimizeInspector.tsx`'s segmented control), keep `--color-canvas-bg: #F2F0F7` / `--color-dark-canvas-bg: #0B0715` as aliases equal to `--color-surface-sunken` / `--color-dark-surface-sunken` rather than deleting the token outright -- do not break those call sites in this step. Add the alias lines back into the block from Step 1 if the grep finds matches.

- [ ] **Step 3: Update `.focus-ring` and `.btn-*` utilities to reference new tokens**

Replace lines in the `@layer utilities` block (previously lines 33-56):

```css
@layer utilities {
  .focus-ring {
    @apply outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-dark-accent dark:focus-visible:ring-offset-dark-surface;
  }

  .btn-primary {
    @apply inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-solid px-4 py-2 text-sm font-semibold text-accent-on outline-none transition hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-subtle dark:bg-dark-accent-solid dark:hover:bg-dark-accent-hover dark:focus-visible:ring-dark-accent dark:focus-visible:ring-offset-dark-surface dark:disabled:bg-dark-ink-subtle;
  }

  .btn-secondary {
    @apply inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold text-accent outline-none transition hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-accent dark:bg-dark-accent-soft dark:text-dark-accent dark:hover:brightness-110 dark:focus-visible:ring-dark-accent dark:focus-visible:ring-offset-dark-surface;
  }

  .btn-secondary-sm {
    @apply inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent outline-none transition hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-dark-accent dark:bg-dark-accent-soft dark:text-dark-accent dark:hover:brightness-110 dark:focus-visible:ring-dark-accent dark:focus-visible:ring-offset-dark-surface;
  }

  .btn-tertiary {
    @apply inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-muted outline-none transition hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-dark-border-strong dark:bg-dark-surface dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken dark:focus-visible:ring-dark-accent dark:focus-visible:ring-offset-dark-surface;
  }

  .scroll-quiet {
    overflow-y: auto;
    overflow-x: clip;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .scroll-quiet:hover,
  .scroll-quiet:focus-within {
    scrollbar-color: var(--color-ink-subtle) transparent;
  }

  .dark .scroll-quiet:hover,
  .dark .scroll-quiet:focus-within {
    scrollbar-color: var(--color-dark-ink-muted) transparent;
  }

  .scroll-quiet::-webkit-scrollbar {
    width: 8px;
  }

  .scroll-quiet::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-quiet::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 9999px;
    border: 2px solid transparent;
    background-clip: content-box;
  }

  .scroll-quiet:hover::-webkit-scrollbar-thumb,
  .scroll-quiet:focus-within::-webkit-scrollbar-thumb {
    background-color: var(--color-ink-subtle);
  }

  .dark .scroll-quiet:hover::-webkit-scrollbar-thumb,
  .dark .scroll-quiet:focus-within::-webkit-scrollbar-thumb {
    background-color: var(--color-dark-ink-muted);
  }
}
```

(The `scroll-quiet` block is unchanged from before -- reproduced here so the file stays internally consistent; only `.focus-ring` and the four `.btn-*` rules actually change.)

- [ ] **Step 4: Update `download-attention-pulse` keyframes to use renamed tokens**

The `--color-action-green` references become `--color-success`. Replace:

```css
@keyframes download-attention-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 45%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px transparent;
  }
}
```

And in the `prefers-reduced-motion` block, replace `var(--color-action-green)` with `var(--color-success)`.

`.transparent-preview` already references `--color-surface` / `--color-border` / `--color-dark-canvas-bg` / `--color-dark-surface` generically -- no change needed there beyond whatever alias was added in Step 2.

- [ ] **Step 5: Verify build compiles**

Run: `npm run build`
Expected: build succeeds (some component files will still reference now-undefined classes like `bg-action-blue-surface`, `text-action-blue`, raw `blue-*`/`gray-*` Tailwind utilities -- those are fixed in later tasks, but Tailwind won't error on unused/undefined-looking utility class names, it just won't style them. A TypeScript/build error here would indicate a typo in the CSS custom-property syntax itself.)

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace blue/slate tokens with violet palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Fonts -- swap Geist for Space Grotesk / Inter / JetBrains Mono

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace the font imports and instances**

Replace lines 1-14 of `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shared/AppShell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});
```

- [ ] **Step 2: Update the `<html>` className and body tokens**

Replace lines 43-66. Note: this file already contains a pre-existing inline `<script dangerouslySetInnerHTML>` used only to apply a persisted theme class before first paint (its content is a hardcoded literal, not user-supplied data, so it is not an XSS vector) -- keep that script exactly as-is, only the surrounding className/body values change:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Apply persisted theme before first paint to prevent a flash.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-bg text-ink dark:bg-dark-bg dark:text-dark-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run the app and confirm fonts load**

Run: `npm run dev` (or `npm run build && npm run start`), open the app, inspect computed `font-family` on the `<body>` in devtools -- should resolve to Inter with fallbacks.

- [ ] **Step 4: Check bundled font weight**

Run: `npm run build` then check `.next/static/media/` for the generated woff2 files:
`ls -la .next/static/media/*.woff2` (or Windows equivalent `dir .next\static\media\*.woff2`)
Sum the file sizes; expected total well under 200 KB given only 6 weight/family combos, all latin-subset.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: swap Geist fonts for Space Grotesk, Inter, JetBrains Mono

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: The anchor-point mark component

**Files:**
- Create: `components/shared/AnchorPointIcon.tsx`
- Test: `components/shared/AnchorPointIcon.test.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { SVGProps } from 'react';

/**
 * The SVGify brand mark: an anchor point with two bezier handles.
 * Used in exactly three places -- header logo, split-view handle,
 * active-tool indicator in the left rail. Do not use elsewhere.
 */
export function AnchorPointIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      {/* handle lines, diagonal from center square to opposite corners */}
      <line x1="12" y1="12" x2="5" y2="5" />
      <line x1="12" y1="12" x2="19" y2="19" />
      {/* center anchor: filled square */}
      <rect x="10" y="10" width="4" height="4" fill="currentColor" stroke="none" />
      {/* handle endpoints: hollow circles */}
      <circle cx="5" cy="5" r="2" fill="none" />
      <circle cx="19" cy="19" r="2" fill="none" />
    </svg>
  );
}
```

- [ ] **Step 2: Write a smoke test**

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AnchorPointIcon } from './AnchorPointIcon';

describe('AnchorPointIcon', () => {
  it('renders an svg with the expected primitive shapes', () => {
    const { container } = render(<AnchorPointIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(container.querySelectorAll('rect')).toHaveLength(1);
    expect(container.querySelectorAll('line')).toHaveLength(2);
  });

  it('accepts a className override for sizing/color', () => {
    const { container } = render(<AnchorPointIcon className="h-6 w-6 text-accent" />);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-accent');
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run components/shared/AnchorPointIcon.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add components/shared/AnchorPointIcon.tsx components/shared/AnchorPointIcon.test.tsx
git commit -m "feat: add AnchorPointIcon brand mark component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Apply the mark -- header logo

**Files:**
- Modify: `components/workspace/TopBar.tsx:50-75`

- [ ] **Step 1: Replace the logo markup**

Replace lines 50-75 (the wordmark block) with:

```tsx
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AnchorPointIcon className="h-6 w-6 shrink-0 text-ink dark:text-dark-ink" />
          <div className="min-w-0">
            <span
              className="block truncate text-[1.75rem] leading-[1.1] font-bold tracking-[-0.03em] text-ink dark:text-dark-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SVGify
            </span>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 dark:bg-dark-success-soft sm:inline-flex">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success dark:bg-dark-success" aria-hidden />
          <span className="text-[11px] font-medium text-ink dark:text-dark-ink">
            {t('app.badge')}
          </span>
        </span>
      </div>
```

This removes the old dark box + `<img>` mark, the `app.tagline` line, and the orphaned `workspace.editableSvg` label per the copy table (Task 8 adds the `app.badge` string). Note: `display` scale is 28px per spec; Tailwind's default scale doesn't have a 28px step, hence the inline `text-[1.75rem]` (28px / 16 = 1.75rem) with `style={{ fontFamily: 'var(--font-display)' }}` since Space Grotesk is not the default `--font-sans`.

- [ ] **Step 2: Add the import**

At the top of `components/workspace/TopBar.tsx`, add:

```tsx
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';
```

- [ ] **Step 3: Visually verify**

Run: `npm run dev`, open the app, confirm the header shows the anchor-point mark at 24x24 (no background box) next to "SVGify" in Space Grotesk, with the on-device badge to its right on desktop widths.

(This step depends on the `app.badge` i18n key from Task 8 existing -- if running this task before Task 8, temporarily hardcode `"On-device . nothing uploaded"` as a string literal instead of `t('app.badge')`, then swap to `t('app.badge')` once Task 8 lands. Do not leave a hardcoded string in the final commit.)

- [ ] **Step 4: Commit**

```bash
git add components/workspace/TopBar.tsx
git commit -m "feat: replace header logo box with anchor-point mark

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Apply the mark -- split-view handle

**Files:**
- Modify: `components/shared/ImageComparisonSlider.tsx`

- [ ] **Step 1: Replace the handle icon and retokenize colors**

Replace the full file:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';

interface ImageComparisonSliderProps {
  before: ReactNode;
  children: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  ariaLabel: string;
  beforeInteractive?: boolean;
}

/**
 * Reveals the original image over the current result without moving either
 * preview, so differences remain easy to inspect at any slider position.
 */
export function ImageComparisonSlider({
  before,
  children,
  beforeLabel,
  afterLabel,
  ariaLabel,
  beforeInteractive = false,
}: ImageComparisonSliderProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {children}

      <div
        className={`absolute inset-0 z-10 overflow-hidden${beforeInteractive ? '' : ' pointer-events-none'}`}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {before}
        <span className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink-muted dark:border-dark-border dark:bg-dark-surface/95 dark:text-dark-ink-muted">
          {beforeLabel}
        </span>
      </div>

      <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink-muted dark:border-dark-border dark:bg-dark-surface/95 dark:text-dark-ink-muted">
        {afterLabel}
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-accent dark:bg-dark-accent"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 -rotate-90 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent dark:border-dark-accent dark:bg-dark-surface dark:text-dark-accent">
          <AnchorPointIcon className="h-4 w-4" />
        </span>
      </div>

      <label className="absolute left-0 top-1/2 z-30 block h-11 w-full -translate-y-1/2">
        <span className="sr-only">{ariaLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="focus-ring h-full w-full cursor-ew-resize opacity-0"
          aria-label={ariaLabel}
        />
      </label>
    </div>
  );
}
```

The `-rotate-90` on the handle badge orients the mark's diagonal handle-lines to point left/right along the slider's horizontal drag axis, per the spec ("los handles apuntando a izquierda y derecha").

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, load an image, trigger the comparison slider, confirm the handle shows the anchor-point mark oriented horizontally, in `--accent` color, no `ArrowsLeftRightIcon` remaining.

- [ ] **Step 3: Commit**

```bash
git add components/shared/ImageComparisonSlider.tsx
git commit -m "feat: replace comparison slider handle with anchor-point mark

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Apply the mark -- active-tool indicator + ToolButton retokenization

**Files:**
- Modify: `components/workspace/ToolButton.tsx`

- [ ] **Step 1: Replace the active-state treatment and retokenize**

Replace the full file:

```tsx
'use client';

import type { Icon } from '@phosphor-icons/react';
import { ToolTooltip } from '@/components/shared/ToolTooltip';
import { AnchorPointIcon } from '@/components/shared/AnchorPointIcon';

interface ToolButtonProps {
  icon: Icon;
  label: string;
  shortcut?: string;
  /** Selected tool (accent anchor-point indicator). Mutually exclusive with mode-only expanded. */
  active?: boolean;
  /** Mode toggle engaged without claiming the selected-tool indicator. */
  expanded?: boolean;
  /** Quiet discovery cue (visual only; no "New" marketing copy). */
  badge?: boolean;
  disabled?: boolean;
  mode?: 'icon' | 'row';
  onClick: () => void;
}

export function ToolButton({
  icon: IconComponent,
  label,
  shortcut,
  active,
  expanded,
  badge,
  disabled,
  mode = 'icon',
  onClick,
}: ToolButtonProps) {
  const accessibleName = shortcut ? `${label} (${shortcut})` : label;
  const filled = Boolean(active || expanded);
  const isRow = mode === 'row';

  return (
    <ToolTooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-label={accessibleName}
        aria-pressed={active === undefined ? undefined : active}
        aria-expanded={expanded === undefined ? undefined : expanded}
        disabled={disabled ? true : undefined}
        onClick={onClick}
        className={[
          'focus-ring relative flex min-h-11 items-center rounded-md border transition-colors duration-150 ease-out',
          isRow
            ? 'w-full justify-start gap-3 px-3 py-2 text-left'
            : 'h-10 w-10 justify-center',
          active || expanded
            ? 'border-transparent text-accent dark:text-dark-accent'
            : 'border-transparent text-ink-muted hover:bg-surface-sunken dark:text-dark-ink-muted dark:hover:bg-dark-surface-sunken',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        ].join(' ')}
      >
        {active ? (
          <AnchorPointIcon
            className="absolute -left-1 h-3 w-3 text-accent dark:text-dark-accent"
            aria-hidden
          />
        ) : null}
        <IconComponent
          size={20}
          weight={filled ? 'fill' : 'regular'}
          aria-hidden
        />
        {isRow ? (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate text-sm font-medium">{label}</span>
            {shortcut ? (
              <span className="font-mono text-[11px] uppercase text-ink-subtle dark:text-dark-ink-subtle">
                {shortcut}
              </span>
            ) : null}
          </span>
        ) : null}
        {badge ? (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface dark:bg-dark-accent dark:ring-dark-surface"
            aria-hidden
          />
        ) : null}
      </button>
    </ToolTooltip>
  );
}
```

Note: the `mode="row"` branch stays in the component (it's the reusable primitive), even though Task 7 deletes the *only current caller* of `mode="row"` -- this keeps the component correct/self-contained rather than half-deleting a documented prop. If Task 7's grep confirms no remaining `mode="row"` callers after the ToolBar rewrite, that's expected; the prop and branch are harmless dead code that costs nothing to keep, and removing it isn't necessary for the design goal.

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, select different tools in the rail, confirm the active tool shows a small anchor-point glyph to the left of the icon in `--accent` instead of a filled colored background, and inactive/hover states use the new sunken-surface token.

- [ ] **Step 3: Commit**

```bash
git add components/workspace/ToolButton.tsx
git commit -m "feat: replace active-tool background with anchor-point indicator

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Collapse ToolBar to a single 64px icon-only rail

**Files:**
- Modify: `components/workspace/ToolBar.tsx`

- [ ] **Step 1: Delete the desktop `lg:flex w-64` branch and unconditionally render the icon rail**

Replace the full file:

```tsx
'use client';

import {
  Eraser,
  Eyedropper,
  ImageSquare,
  Lightning,
  MagicWand,
  PaintBrush,
  PaintBucket,
  PenNib,
  Tag,
  Trash,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { ToolButton } from './ToolButton';
import {
  isShapeTool,
  isToolEnabled,
  WORKSPACE_TOOL_GROUPS,
} from '@/lib/workspaceTools';
import { useI18n } from '@/lib/i18n';
import type { WorkspaceDocument, WorkspaceTool } from '@/types/workspace.types';

const TOOL_ICONS: Record<WorkspaceTool, Icon> = {
  import: ImageSquare,
  vectorize: MagicWand,
  eyedropper: Eyedropper,
  fill: PaintBucket,
  erase: Eraser,
  erasePath: Trash,
  brush: PaintBrush,
  nodes: PenNib,
  labels: Tag,
  optimize: Lightning,
};

function isFillMode(tool: WorkspaceTool): boolean {
  return tool === 'fill' || tool === 'eyedropper';
}

function isEraseMode(tool: WorkspaceTool): boolean {
  return tool === 'erase' || tool === 'erasePath';
}

interface ToolBarProps {
  activeTool: WorkspaceTool;
  document: WorkspaceDocument;
  onToolChange: (tool: WorkspaceTool) => void;
  /** Quiet discovery cue on Points until the user opens a shape tool. */
  showRefineHint?: boolean;
}

export function ToolBar({
  activeTool,
  document,
  onToolChange,
  showRefineHint = false,
}: ToolBarProps) {
  const { t } = useI18n();
  const hasSvg = document.svgString !== null;
  const hasImage = document.imageData !== null;
  const fillOpen = isFillMode(activeTool);
  const shapeOpen = isShapeTool(activeTool);
  const eraseOpen = isEraseMode(activeTool);

  const visibleGroups = WORKSPACE_TOOL_GROUPS.filter(
    (group) => !group.requiresSvg || hasSvg
  );

  return (
    <nav
      role="toolbar"
      aria-label={t('workspace.tools')}
      className="scroll-quiet flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2 dark:border-dark-border dark:bg-dark-surface"
    >
      {visibleGroups.map((group, groupIndex) => {
        const isEdit = group.id === 'edit';
        const isShape = group.id === 'shape';
        const isLast = groupIndex === visibleGroups.length - 1;

        return (
          <div key={group.id} className="flex flex-col items-center gap-1">
            {isEdit ? (
              <div
                role="group"
                aria-label={t('tool.group.edit')}
                className="flex flex-col items-center gap-1"
              >
                <ToolButton
                  icon={PaintBucket}
                  label={t('tool.fill')}
                  shortcut="G"
                  active={activeTool === 'fill'}
                  expanded={activeTool === 'eyedropper' ? true : undefined}
                  disabled={!isToolEnabled('fill', document)}
                  onClick={() => onToolChange('fill')}
                />
                {fillOpen ? (
                  <ToolButton
                    icon={Eyedropper}
                    label={t('tool.eyedropper')}
                    shortcut="I"
                    active={activeTool === 'eyedropper'}
                    disabled={!isToolEnabled('eyedropper', document)}
                    onClick={() => onToolChange('eyedropper')}
                  />
                ) : null}
              </div>
            ) : isShape ? (
              <div
                role="group"
                aria-label={t('tool.group.shape')}
                className="flex flex-col items-center gap-1"
              >
                <ToolButton
                  icon={PenNib}
                  label={t('tool.nodes')}
                  shortcut="A"
                  active={activeTool === 'nodes'}
                  expanded={shapeOpen && activeTool !== 'nodes' ? true : undefined}
                  badge={showRefineHint && !shapeOpen}
                  disabled={!isToolEnabled('nodes', document)}
                  onClick={() => onToolChange('nodes')}
                />
                {shapeOpen ? (
                  <>
                    <ToolButton
                      icon={PaintBrush}
                      label={t('tool.brush')}
                      shortcut="B"
                      active={activeTool === 'brush'}
                      disabled={!isToolEnabled('brush', document)}
                      onClick={() => onToolChange('brush')}
                    />
                    <ToolButton
                      icon={Eraser}
                      label={t('tool.erase')}
                      shortcut="E"
                      active={activeTool === 'erase'}
                      expanded={activeTool === 'erasePath' ? true : undefined}
                      disabled={!isToolEnabled('erase', document)}
                      onClick={() => onToolChange('erase')}
                    />
                    {eraseOpen ? (
                      <ToolButton
                        icon={Trash}
                        label={t('tool.erasePath')}
                        shortcut="X"
                        active={activeTool === 'erasePath'}
                        disabled={!isToolEnabled('erasePath', document)}
                        onClick={() => onToolChange('erasePath')}
                      />
                    ) : null}
                    <ToolButton
                      icon={Tag}
                      label={t('tool.labels')}
                      shortcut="L"
                      active={activeTool === 'labels'}
                      disabled={!isToolEnabled('labels', document)}
                      onClick={() => onToolChange('labels')}
                    />
                  </>
                ) : null}
              </div>
            ) : (
              <div
                role="group"
                aria-label={t(`tool.group.${group.id}`)}
                className="flex flex-col items-center gap-1"
              >
                {group.tools.map(({ id, shortcut }) => (
                  <ToolButton
                    key={id}
                    icon={TOOL_ICONS[id]}
                    label={
                      id === 'import' && hasImage
                        ? t('workspace.replaceImage')
                        : t(`tool.${id}`)
                    }
                    shortcut={shortcut}
                    active={activeTool === id}
                    disabled={!isToolEnabled(id, document)}
                    onClick={() => onToolChange(id)}
                  />
                ))}
              </div>
            )}
            {!isLast ? (
              <div
                className="my-0.5 h-px w-8 shrink-0 bg-border dark:bg-dark-border"
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
```

Notes:
- `w-16` = 64px (Tailwind's `w-16` is `4rem` = 64px), replacing the old `w-14` (56px) -- spec asks for 64px specifically.
- The `hasImage` conditional label for the import tool (`"Replace image"` vs `"Import"`) is preserved exactly as it existed in the old icon-only branch, so this is a like-for-like behavior carry-over, not a new decision.

- [ ] **Step 2: Check callers for now-dead code**

Run: `grep -rn "DESKTOP_TOOL_HINT_KEYS\|renderDesktopTool\|desktopHint\|desktopShapeTools" components/workspace/`

Confirm these were only used inside the old `ToolBar.tsx` desktop branch (module-private) and nothing outside the file referenced them -- this should be a no-op check confirming the deletion above was safe.

- [ ] **Step 3: Run existing component/behavior tests**

Run: `grep -rln "w-64\|desktopHint\|editableSvg" test/ app --include=*.test.* 2>/dev/null` first to see if any test file asserts on the old desktop rail markup.

Then run: `npx vitest run` (project-wide). If a test file exists asserting on the old wide-rail structure (`w-64`, row-mode buttons, `desktopHint` text), update its expectations to match the new single-rail markup -- do not delete the test, adjust its assertions to the new DOM.

- [ ] **Step 4: Visually verify at desktop width**

Run: `npm run dev`, resize the browser to >=1280px, confirm the left rail is 64px icon-only (no more wide labeled rail), hovering an icon shows the tooltip with name + shortcut, and canvas width visibly increased versus before.

- [ ] **Step 5: Commit**

```bash
git add components/workspace/ToolBar.tsx
git commit -m "feat: collapse left rail to a single 64px icon-only nav at all breakpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Copy pass -- `lib/i18n.tsx`

**Files:**
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Add the new header badge key, remove the now-unused tagline key**

Run: `grep -n "app.tagline" components/ -r`

Since Task 4 removed `app.tagline`'s only consumer (`TopBar.tsx`'s old subtitle line), and this grep should confirm no other caller exists, delete the `'app.tagline'` key (line 17) entirely. In its place, add:

```tsx
  'app.badge': { en: 'On-device · nothing uploaded', es: 'En tu dispositivo · nada se sube' },
```

(Use a literal middle-dot character `·`, i.e. "·", directly in the source rather than the escape -- written here as an escape only to survive this document's own rendering.)

- [ ] **Step 2: Footer copy -- drop the privacy line, delete `app.footer`**

Delete the `'app.footer'` key entirely (line 18). Task 9 rewrites `AppShell.tsx`'s footer to read "MIT licensed · Source on GitHub" using a hardcoded "MIT licensed" string (a license name, not user-facing prose that needs translation) plus the existing `app.source` key for the link text -- so no replacement i18n key is needed for the removed privacy line.

- [ ] **Step 3: Vectorize panel copy**

Replace line 124:

```tsx
  'vec.subtitle': { en: 'Changes re-run automatically.', es: 'Los cambios se aplican automáticamente.' },
```

Replace line 172:

```tsx
  'set.traceMode': { en: 'Image type', es: 'Tipo de imagen' },
```

Replace lines 179-181:

```tsx
  'set.detailLevel.clean': { en: 'Simple', es: 'Simple' },
  'set.detailLevel.balanced': { en: 'Balanced', es: 'Equilibrado' },
  'set.detailLevel.detailed': { en: 'Detailed', es: 'Detallado' },
```

(Keep the dict key `set.detailLevel.clean` as-is even though the displayed EN string becomes "Simple" -- renaming the key would require touching every `t(\`set.detailLevel.${settings.detailLevel}\`)` call site and the underlying `detailLevel` enum value in settings state, which is out of scope; only the displayed string changes.)

Replace lines 203-204:

```tsx
  'bg.tolerance': { en: 'Background tolerance', es: 'Tolerancia de fondo' },
  'bg.tolerance.help': { en: 'Higher removes more of the background.', es: 'Más alto quita más del fondo.' },
```

- [ ] **Step 4: Status bar / optimize copy**

Replace line 468:

```tsx
  'workspace.readyToDownload': { en: 'Ready to optimize', es: 'Listo para optimizar' },
```

Find and replace the `optimize.prepare.help` value (around line 428):

```tsx
  'optimize.prepare.help': {
    en: 'Merges duplicate colors and simplifies paths. Usually cuts the file size in half.',
    es: 'Fusiona colores duplicados y simplifica trazos. Suele reducir el tamaño del archivo a la mitad.',
  },
```

Replace `'optimize.prepare'` (around line 423):

```tsx
  'optimize.prepare': {
    en: 'Optimize & download',
    es: 'Optimizar y descargar',
  },
```

Replace `'workspace.downloadUnprepared'` (around line 469):

```tsx
  'workspace.downloadUnprepared': {
    en: 'Download raw SVG',
    es: 'Descargar SVG sin optimizar',
  },
```

Replace `'workspace.downloadRaw'` (around line 477, this is the tooltip text):

```tsx
  'workspace.downloadRaw': {
    en: 'Skips cleanup. Larger file.',
    es: 'Omite la limpieza. Archivo más grande.',
  },
```

- [ ] **Step 5: Run i18n consumers' tests**

Run: `grep -rln "ready to ship\|Cleans the palette\|Prepare for download\|Download without preparing\|prepare to download\|Vectorize on your device" test/ components --include=*.test.* 2>/dev/null` to find any test asserting on the old literal strings.

Then run: `npx vitest run`. Update any failing assertion to the new string -- do not delete the test, fix its expected value.

- [ ] **Step 6: Commit**

```bash
git add lib/i18n.tsx
git commit -m "feat: rewrite copy per violet reskin spec (header badge, panel, status bar)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Footer rewrite + AppShell/remaining component retokenization

**Files:**
- Modify: `components/shared/AppShell.tsx`
- Modify: `components/workspace/TopBar.tsx` (retokenize remaining raw grays not touched in Task 4)
- Modify: `components/workspace/ToolTooltip.tsx`
- Modify: `components/workspace/inspectors/VectorizeInspector.tsx:120`
- Modify: `components/workspace/inspectors/OptimizeInspector.tsx:266,293`

- [ ] **Step 1: Rewrite the footer**

Replace `components/shared/AppShell.tsx` lines 7-29:

```tsx
function Footer() {
  const { t } = useI18n();
  return (
    <footer className="shrink-0 border-t border-border bg-surface px-4 py-1 text-center text-[11px] leading-snug text-ink-muted dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink-muted">
      <p>
        <span className="text-ink-muted dark:text-dark-ink-muted">MIT licensed</span>
        {' · '}
        <a
          href="https://github.com/csswoman/svg-tool"
          className="focus-ring rounded underline decoration-border-strong underline-offset-2 hover:text-ink dark:decoration-dark-border-strong dark:hover:text-dark-ink"
          title={t('app.source.hint')}
          aria-label={t('app.source.hint')}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('app.source')}
        </a>
      </p>
    </footer>
  );
}
```

(Write the literal "·" character directly in the source, not the `·` escape -- shown escaped here only for this document.)

- [ ] **Step 2: Retokenize `ToolTooltip.tsx`**

Replace line 50 in `components/workspace/ToolTooltip.tsx`:

```tsx
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-surface shadow-lg dark:bg-dark-ink-muted dark:text-dark-bg"
```

And line 54:

```tsx
            <span className="ml-2 font-mono text-ink-subtle dark:text-dark-bg">{shortcut}</span>
```

(Tooltip background uses `--ink`/`--dark-ink-muted` as a dark chip regardless of theme, consistent with the prior `gray-900`/`gray-950` treatment -- a near-black/near-violet-ink chip in both themes.)

- [ ] **Step 3: Retokenize remaining `TopBar.tsx` raw grays**

Run: `grep -n "gray-\|blue-\|green-" components/workspace/TopBar.tsx`

For each match not already touched in Task 4 (the undo/redo buttons, mobile button group, inspector toggle, theme/lang toggles), replace:
- `border-gray-200` -> `border-border`, `dark:border-gray-700` -> `dark:border-dark-border`
- `bg-white` -> `bg-surface`, `dark:bg-gray-800` -> `dark:bg-dark-surface`
- `text-gray-600` -> `text-ink-muted`, `dark:text-gray-300` -> `dark:text-dark-ink-muted`
- `hover:bg-gray-100` / `hover:bg-gray-50` -> `hover:bg-surface-sunken`, `dark:hover:bg-gray-700` -> `dark:hover:bg-dark-surface-sunken`
- `bg-gray-50` (mobile button group bg) -> `bg-surface-sunken`, `dark:bg-gray-900` -> `dark:bg-dark-surface-sunken`
- `bg-green-50` / `text-green-700` (prepared pill) -> `bg-success-soft` / `text-success`, dark: `dark:bg-dark-success-soft` / `dark:text-dark-success`
- `text-gray-700` -> `text-ink-muted`, `dark:text-gray-300` -> `dark:text-dark-ink-muted` (lang toggle button)

Apply these substitutions directly in the file (mechanical find/replace guided by the grep output -- every occurrence must be handled, not just a sample).

- [ ] **Step 4: Retokenize `VectorizeInspector.tsx:120` and `OptimizeInspector.tsx:266,293`**

In `components/workspace/inspectors/VectorizeInspector.tsx`, replace line 120's className:

```tsx
                  className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-accent transition hover:text-accent-hover dark:text-dark-accent dark:hover:text-dark-accent-hover"
```

In `components/workspace/inspectors/OptimizeInspector.tsx`, replace line 266. This is a segmented control (the prepare-preset picker) -- per spec Section 6, segmented controls must NOT use `--accent-soft` for the active item in light mode ("En light no uses --accent-soft aquí -- se satura el panel"); the active item instead gets a raised `--surface` background with a subtle shadow, active text in `--text`/`--ink`, inactive in `--text-muted`/`--ink-muted`. The container (`bg-canvas-bg` from the original, aliased to `--color-surface-sunken` per Task 1 Step 2) already gives the sunken-container half of the pattern -- only the active-item styling needs correcting away from the blue-tinted fill it previously used:

```tsx
                  ? 'bg-surface text-ink shadow-sm dark:bg-dark-surface dark:text-dark-ink'
```

And line 293:

```tsx
            <p className="text-sm font-semibold text-success dark:text-dark-success">
```

- [ ] **Step 5: Full grep sweep for any remaining blue/action-blue/action-green references**

Run: `grep -rn "action-blue\|action-green\|blue-[0-9]\|green-[0-9]\|gray-[0-9]" app/ components/ lib/ hooks/`

For every remaining hit, apply the same token substitution pattern as Step 3 (`gray-*` -> `ink-muted`/`border`/`surface-sunken` family, `blue-*`/`action-blue` -> `accent` family, `green-*`/`action-green` -> `success` family), file by file, until the grep returns nothing. This will likely touch `components/labels/LabelSidebar.tsx`, `components/labels/LabelInput.tsx`, `components/shape/PathList.tsx`, `components/shape/NodeEditor.tsx`, `components/upload/ImageDropzone.tsx`, `components/shared/CanvasOverlay.tsx`, `components/shared/LoadingState.tsx`, `components/workspace/Canvas.tsx`, `hooks/useWorkspaceLabels.ts`, `lib/sampleImage.ts` -- inspect each hit's context (some `gray-*` hits may be legitimate references to canvas/user-image content rather than chrome, e.g. sample fixture data in `lib/sampleImage.ts` -- leave user/canvas-content colors alone per the spec's "canvas is user territory" rule, only retokenize chrome UI).

- [ ] **Step 6: Verify the acceptance grep is clean**

Run: `grep -ri "3b82f6\|blue-500\|blue-600" app/ components/ lib/ hooks/`
Expected: no output.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (fix any that assert on now-changed class names or copy strings, per Task 7/8's verification steps).

- [ ] **Step 8: Commit**

```bash
git add components/shared/AppShell.tsx components/workspace/ToolTooltip.tsx components/workspace/TopBar.tsx components/workspace/inspectors/VectorizeInspector.tsx components/workspace/inspectors/OptimizeInspector.tsx
git commit -m "feat: retokenize remaining chrome components to violet palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(If Step 5's sweep touches additional files beyond the ones staged here, add and commit those too in this same commit, or as a clearly-scoped follow-up commit -- do not leave any file with unstaged token changes.)

---

## Task 10: Empty state

**Files:**
- Create: `components/upload/EmptyStateHeader.tsx`
- Test: `components/upload/EmptyStateHeader.test.tsx`
- Modify: `components/upload/ImageDropzone.tsx`
- Modify: `lib/i18n.tsx`

- [ ] **Step 1: Find where the pre-upload dropzone is currently rendered**

Run: `grep -rln "ImageDropzone" components/workspace/ components/shared/ app/`

Read that call site (likely `components/workspace/Workspace.tsx` or an `ImportInspector`/initial-state branch) to confirm where `compact={false}` (full, non-replace mode) is used -- that's where `EmptyStateHeader` gets inserted above the dropzone.

- [ ] **Step 2: Check `upload.formats`' existing content before adding new keys**

Run: `grep -n "'upload.formats'" lib/i18n.tsx`

If its content already reads close to "PNG · JPG · WEBP · up to 10 MB", reuse it directly in Step 6 rather than adding a duplicate `upload.emptyHint` key. If it differs meaningfully (e.g. different formats or missing the size limit), add:

```tsx
  'upload.emptyHint': { en: 'PNG · JPG · WEBP · up to 10 MB', es: 'PNG · JPG · WEBP · hasta 10 MB' },
```

(literal "·" character in source, not the escape) and use `upload.emptyHint` in Step 6 instead.

- [ ] **Step 3: Add the empty-state headline/sub copy keys**

In `lib/i18n.tsx`, add near the `upload.*` keys:

```tsx
  'upload.emptyHeadline': { en: 'Turn any image into an editable SVG.', es: 'Convierte cualquier imagen en un SVG editable.' },
  'upload.emptySub': { en: 'Runs entirely in your browser. Nothing is uploaded, nothing is stored.', es: 'Funciona completamente en tu navegador. Nada se sube, nada se almacena.' },
```

- [ ] **Step 4: Write the component**

```tsx
import { useI18n } from '@/lib/i18n';

/** Headline + sub copy shown above the dropzone before any image is loaded. */
export function EmptyStateHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-6 max-w-md space-y-2 text-center">
      <h1
        className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.03em] text-ink dark:text-dark-ink"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t('upload.emptyHeadline')}
      </h1>
      <p className="text-[13px] leading-normal text-ink-muted dark:text-dark-ink-muted">
        {t('upload.emptySub')}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Write a smoke test**

First check the existing pattern for testing i18n-dependent components:

Run: `grep -rln "I18nProvider" --include=*.test.tsx .`

Read one such test file to copy its exact `I18nProvider` wrapper usage (props required, if any), then write:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { EmptyStateHeader } from './EmptyStateHeader';

describe('EmptyStateHeader', () => {
  it('renders the headline and sub copy', () => {
    render(
      <I18nProvider>
        <EmptyStateHeader />
      </I18nProvider>
    );
    expect(
      screen.getByRole('heading', { name: 'Turn any image into an editable SVG.' })
    ).toBeTruthy();
    expect(
      screen.getByText('Runs entirely in your browser. Nothing is uploaded, nothing is stored.')
    ).toBeTruthy();
  });
});
```

Adjust the `I18nProvider` usage to match whatever the existing pattern from the grep requires (e.g. it may need to be rendered inside a broader provider tree, or accept a `defaultLang` prop) -- do not guess if the grep surfaces a different pattern than shown here.

- [ ] **Step 6: Run the test**

Run: `npx vitest run components/upload/EmptyStateHeader.test.tsx`
Expected: PASS

- [ ] **Step 7: Wire `EmptyStateHeader` above the dropzone and update dropzone copy/tokens**

In the call site found in Step 1, render `<EmptyStateHeader />` immediately above the non-compact `<ImageDropzone .../>`.

In `components/upload/ImageDropzone.tsx`, replace line 91:

```tsx
        'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 dark:focus-within:ring-offset-dark-surface',
```

Replace lines 95-97:

```tsx
        isDragging
          ? 'border-accent bg-accent-soft dark:bg-dark-accent-soft/40'
          : 'transparent-preview border-border-strong hover:border-ink-subtle dark:border-dark-border-strong dark:hover:border-dark-ink-subtle',
```

(Adding the `transparent-preview` class gives the dropzone the checkerboard texture per the spec -- this class already exists in `globals.css` and is otherwise used on the canvas preview; reusing it here is explicitly endorsed by the spec: "El checkerboard como textura del dropzone es identidad gratis". `transparent-preview` sets its own `background-color`/`background-image`, so it fully replaces the previous `bg-gray-50 dark:bg-gray-800/50` -- do not keep a separate `bg-*` class alongside it.)

Replace line 109's and line 112's text color classes similarly (`text-gray-800` -> `text-ink`, `dark:text-gray-100` -> `dark:text-dark-ink`, `text-gray-500` -> `text-ink-muted`, `dark:text-gray-400` -> `dark:text-dark-ink-muted`).

For the non-compact hint line (line 112), add `font-mono` to its className when `!compact`, per the spec's "Hint (mono 11px)" treatment, and use whichever key Step 2 settled on (`upload.formats` or `upload.emptyHint`).

- [ ] **Step 8: Visually verify the empty state**

Run: `npm run dev`, view the app with no image loaded, confirm: headline in Space Grotesk 28px, sub copy in Inter, checkerboard-textured dropzone with dashed border, accent-colored border on drag-over, mono hint text below.

- [ ] **Step 9: Commit**

```bash
git add components/upload/EmptyStateHeader.tsx components/upload/EmptyStateHeader.test.tsx components/upload/ImageDropzone.tsx lib/i18n.tsx
git commit -m "feat: add designed empty state with checkerboard dropzone

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10.5: Custom slider and checkbox styling

**Files:**
- Modify: `components/workspace/inspectorChrome.ts`
- Modify: `app/globals.css` (native range/checkbox pseudo-element rules)

The spec's Section 6 requires a custom slider treatment (4px track in `--border`, fill in `--accent`, 14px thumb with `--surface` fill + 2px `--accent` border + soft shadow) that the current `accent-action-blue` (native `accent-color` only) cannot produce — `accent-color` recolors the browser's native thumb/track as a single flat color with no track/thumb-independent styling and no shadow. This requires actual `input[type="range"]::-webkit-slider-thumb` / `::-moz-range-thumb` / `::-webkit-slider-runnable-track` rules.

- [ ] **Step 1: Add custom range-input styling to `globals.css`**

Add a new rule block to `app/globals.css` (after the `@layer utilities` block):

```css
@layer utilities {
  .themed-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    background: transparent;
    cursor: pointer;
  }

  .themed-range::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 9999px;
    background: var(--color-border);
  }

  .dark .themed-range::-webkit-slider-runnable-track {
    background: var(--color-dark-border);
  }

  .themed-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -5px;
    height: 14px;
    width: 14px;
    border-radius: 9999px;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--color-ink) 20%, transparent);
  }

  .dark .themed-range::-webkit-slider-thumb {
    background: var(--color-dark-surface);
    border-color: var(--color-dark-accent);
  }

  .themed-range::-moz-range-track {
    height: 4px;
    border-radius: 9999px;
    background: var(--color-border);
  }

  .dark .themed-range::-moz-range-track {
    background: var(--color-dark-border);
  }

  .themed-range::-moz-range-thumb {
    height: 14px;
    width: 14px;
    border-radius: 9999px;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--color-ink) 20%, transparent);
  }

  .dark .themed-range::-moz-range-thumb {
    background: var(--color-dark-surface);
    border-color: var(--color-dark-accent);
  }
}
```

Append this block to the existing `@layer utilities` in `app/globals.css` from Task 1 (do not open a second `@layer utilities` block — merge into the one already there).

- [ ] **Step 2: Swap `inspectorRange` and `inspectorCheckbox` to the new treatment**

Replace `components/workspace/inspectorChrome.ts` lines 14-22:

```tsx
/** Compact track -- label sits close; 32px still meets touch guidance. */
export const inspectorRange = 'themed-range h-8 w-full';

export const inspectorHint = 'text-pretty text-xs text-ink-muted dark:text-dark-ink-muted';

export const inspectorMono = 'font-mono text-[11px] tabular-nums text-ink-muted dark:text-dark-ink-muted';

export const inspectorCheckbox =
  'h-4 w-4 accent-accent dark:accent-dark-accent';
```

(The checkbox keeps using native `accent-color` — the spec's checkbox requirement, "`--accent-solid` cuando está marcado, check blanco," is exactly what `accent-color` already produces for a native checkbox; only the range input needed the custom pseudo-element treatment. Tailwind v4 generates `accent-accent`/`accent-dark-accent` utilities from the `--color-accent`/`--color-dark-accent` tokens the same way it already generated `accent-action-blue` from the old token.)

- [ ] **Step 3: Sweep for any other native range/checkbox inputs outside `inspectorChrome.ts`'s shared classes**

Run: `grep -rn "type=\"range\"\|type=\"checkbox\"" components/ --include=*.tsx`

For every match not already using `inspectorRange`/`inspectorCheckbox`, apply the same `themed-range` class (for ranges) or `accent-accent dark:accent-dark-accent` (for checkboxes) directly, following whatever ad hoc className that input already had.

- [ ] **Step 4: Visually verify**

Run: `npm run dev`, open the Vectorize inspector, confirm sliders show a thin muted track with a white/surface-filled circular thumb bordered in accent color (not a solid flat native thumb), and checkboxes show an accent-filled check when checked.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/workspace/inspectorChrome.ts
git commit -m "feat: custom slider thumb/track styling per violet design spec

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Mono rule audit -- ensure all tool-generated numbers use JetBrains Mono

**Files:**
- Modify: `components/workspace/StatusBar.tsx` (verify/extend)
- Review: `components/workspace/inspectors/OptimizeInspector.tsx`, `components/vectorize/VectorizeSettings.tsx`, `components/colors/ColorPicker.tsx`, `components/workspace/inspectorChrome.ts`, `components/workspace/Workspace.tsx`

- [ ] **Step 1: Confirm `inspectorChrome.ts` defines a mono utility and it's applied everywhere numbers appear**

Read `components/workspace/inspectorChrome.ts` (already referenced by `VectorizeInspector.tsx` as `inspectorHint`, `inspectorLabel`, `inspectorRange`, `inspectorCheckbox`, and by `OptimizeInspector.tsx` as `inspectorMono`). Confirm the pattern -- no change needed if it already exists and is `font-mono`-based.

- [ ] **Step 2: Sweep for numeric labels missing `font-mono`**

Run: `grep -n "font-mono\|{bgTolerance}\|{settings.alphaThreshold}\|{paletteColors.length}\|{pathCount\|{byteSize\|hex" components/workspace/inspectors/VectorizeInspector.tsx components/workspace/StatusBar.tsx components/colors/ColorPicker.tsx`

For each numeric value rendered without an ancestor or direct `font-mono` class (`VectorizeInspector.tsx:102`'s `bgTolerance` span already has `font-mono` -- confirm `settings.alphaThreshold` at line 132 does too), add `font-mono` to any bare `{number}` interpolation found lacking it. Do the same for hex values displayed in `ColorPicker.tsx` (check for a hex `<input>` or `<span>` and add `font-mono` if missing).

- [ ] **Step 3: Confirm `StatusBar.tsx`'s metric line stays mono and includes color count**

`StatusBar.tsx` line 73 already wraps the paths/bytes span in `font-mono tabular-nums`. Per spec's status-bar format `70 shapes · 39.9 KB · 9 colors`, check whether a `colorCount` prop currently reaches `StatusBar`:

Run: `grep -n "StatusBar" components/workspace/Workspace.tsx`

If `StatusBar` isn't currently passed a color/palette count, add a `colorCount?: number` prop to `StatusBarProps` in `components/workspace/StatusBar.tsx`, thread it from wherever `paletteColors.length` is available in the parent (`Workspace.tsx`, from the `useVectorizeSession` result), and render it in the metrics span:

```tsx
        hasSvg ? (
          <span className="inline-flex items-center gap-2 font-mono tabular-nums text-ink dark:text-dark-ink">
            <span>
              {pathCount ?? 0} {t('workspace.paths')}
            </span>
            <span className="text-border dark:text-dark-border" aria-hidden>
              ·
            </span>
            <span>{byteSize !== null ? formatBytes(byteSize) : '0 B'}</span>
            {colorCount !== undefined ? (
              <>
                <span className="text-border dark:text-dark-border" aria-hidden>
                  ·
                </span>
                <span>
                  {colorCount} {colorCount === 1 ? t('vec.color') : t('vec.colors')}
                </span>
              </>
            ) : null}
          </span>
        ) : null
```

(Use the literal "·" character in source, not the `·` escape, matching the existing separator already in this file.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: all pass; fix any `StatusBar` test snapshots/assertions that now expect the added `colorCount` prop or its rendered output.

- [ ] **Step 5: Visually verify**

Run: `npm run dev`, vectorize a sample image, confirm the status bar reads e.g. `70 shapes · 39.9 KB · 9 colors` all in mono, and slider/setting numeric values throughout the inspector are mono while their labels are not.

- [ ] **Step 6: Commit**

```bash
git add components/workspace/StatusBar.tsx components/workspace/Workspace.tsx components/workspace/inspectors/VectorizeInspector.tsx components/colors/ColorPicker.tsx
git commit -m "feat: enforce mono rule on all tool-generated numbers in status bar and inspectors

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Contrast, reduced-motion, and focus-visible audit

**Files:**
- Review: all files touched in prior tasks
- Modify: any failing spot found below

- [ ] **Step 1: Check contrast ratios for the new token pairs**

Using the token hex values from Task 1, verify (by calculator or a contrast-check tool):
- `--color-ink` (`#1A1030`) on `--color-surface` (`#FFFFFF`) -- must be >= 7:1 (this is a very dark ink on white; expect comfortably >12:1, no action needed but confirm).
- `--color-ink-muted` (`#5A5170`) on `--color-bg`/`--color-surface` -- must be >= 4.5:1.
- `--color-accent` (`#6A28E0`) as text on `--color-surface` -- must be >= 4.5:1 (used for links like the "Clear seeds" button and active-tool text).
- Dark mode: `--color-dark-ink` (`#F3F0FA`) on `--color-dark-surface` (`#171029`) >= 7:1; `--color-dark-accent` (`#9B6BFF`) as text on `--color-dark-surface` >= 4.5:1.

If any pair fails, do not silently change the spec's hex values -- flag it back to the user rather than guessing a fix, since the spec's exact hex values were user-specified and non-negotiable per the design doc. (Quick sanity check: `#6A28E0` on white is a well-known-safe violet/purple and should pass comfortably; this step is a verification, not expected to surface a real failure.)

- [ ] **Step 2: Confirm `prefers-reduced-motion` still covers any new transitions**

Run: `grep -n "transition" components/workspace/ToolButton.tsx components/shared/ImageComparisonSlider.tsx`

The existing global rule in `globals.css` (unchanged by this plan) applies `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;` under `@media (prefers-reduced-motion: reduce)` to `*, *::before, *::after` -- this already covers any `transition-colors` classes added in this plan (e.g. `ToolButton.tsx`'s `transition-colors duration-150`) with no additional work needed. Confirm no new transition was added with an inline `!important` or a transition property outside CSS (e.g. a JS-driven animation) that would bypass this global rule.

- [ ] **Step 3: Confirm `.focus-ring` is applied to every new/changed interactive element**

Check every interactive element touched in this plan has `focus-ring` (or an existing equivalent focus treatment): `ToolButton.tsx` button (has it, unchanged), `ImageComparisonSlider.tsx`'s range input (has it, unchanged), `ImageDropzone.tsx`'s label (has `focus-within:ring-2 focus-within:ring-accent`, updated in Task 10), footer link in `AppShell.tsx` (has `focus-ring`, unchanged), `TopBar.tsx` buttons (has `focus-ring`, unchanged). No new interactive elements were introduced without this treatment in this plan -- confirm and move on.

- [ ] **Step 4: Commit if any fixes were needed**

If Step 1-3 required changes:

```bash
git add -A
git commit -m "fix: contrast/focus-visible/reduced-motion audit fixes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

If no changes were needed, skip the commit -- this task was verification-only.

---

## Task 13: Responsive check -- right inspector collapses below 900px

**Files:**
- Review: `components/workspace/Workspace.tsx`, `components/workspace/Inspector.tsx`

- [ ] **Step 1: Confirm current responsive breakpoint behavior for the inspector**

Read `components/workspace/Workspace.tsx` and `components/workspace/Inspector.tsx` to find the current mobile/desktop split for the right panel (likely a Tailwind `lg:` breakpoint driving a bottom-sheet vs. sidebar layout already, given `TopBar.tsx`'s `showInspectorToggle`/`inspectorOpen` props exist specifically for a mobile toggle).

- [ ] **Step 2: Verify the breakpoint matches the spec's 900px, not Tailwind's default `lg` (1024px)**

Run: `grep -n "lg:\|md:\|900px\|@media" components/workspace/Inspector.tsx components/workspace/Workspace.tsx`

If the existing collapse uses Tailwind's default `lg` (1024px) rather than 900px, this is a pre-existing behavior, not something this plan is required to change unless the spec's acceptance criterion is read strictly. Given the spec says "por debajo de 900px" specifically: if the current breakpoint is `lg` (1024px), add a custom breakpoint. In `app/globals.css`'s `@theme inline` block (Task 1), add:

```css
  --breakpoint-inspector: 900px;
```

Then in `Inspector.tsx`/`Workspace.tsx`, replace the relevant `lg:` prefixes controlling the inspector's sidebar-vs-sheet layout with `inspector:` (Tailwind v4 auto-generates a variant from a `--breakpoint-*` token named this way). Do not change `lg:` usages that control the *left rail* or other unrelated layout -- only the inspector collapse breakpoint.

- [ ] **Step 3: Visually verify**

Run: `npm run dev`, resize the browser window to 899px and 901px width, confirm the inspector is a bottom sheet below 900px and a sidebar at/above it, and the left rail stays fixed at 64px at both widths.

- [ ] **Step 4: Commit if changed**

```bash
git add app/globals.css components/workspace/Inspector.tsx components/workspace/Workspace.tsx
git commit -m "fix: align inspector responsive collapse to 900px breakpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

If the existing breakpoint already satisfied this (e.g. it was already a custom 900px value), skip the commit.

---

## Task 14: Screenshots

**Files:** none (verification task)

- [ ] **Step 1: Capture empty state, both themes**

Run the app (`npm run dev`), use the Playwright MCP tools (`browser_navigate`, `browser_resize` to a representative desktop width like 1440x900, `browser_take_screenshot`) to capture:
- Empty state, light theme
- Empty state, dark theme (toggle via the theme button, screenshot again)

- [ ] **Step 2: Capture loaded state, both themes**

Load a sample image (there's a sample image path in `lib/sampleImage.ts` -- use it or drop a test PNG), vectorize it, and screenshot:
- Loaded/vectorized state, light theme
- Loaded/vectorized state, dark theme

- [ ] **Step 3: Self-critique against the acceptance criteria list**

Compare all 4 screenshots against `docs/superpowers/specs/2026-08-21-violet-brand-reskin-design.md`'s Section 8 acceptance criteria one by one. Note any visual criterion that doesn't hold (e.g. mono not applied somewhere visible, mark appearing in a 4th place, accent color inconsistency between light/dark) and fix before proceeding -- do not defer visual defects found here.

- [ ] **Step 4: Save screenshots for the record**

Save the 4 screenshots to a scratch location and reference them in the PR/commit description (this repo doesn't appear to have a docs/screenshots convention -- do not invent one; just ensure they're available to attach to the PR description in the finishing step).

---

## Task 15: `DESIGN.md` rewrite

**Files:**
- Modify: `DESIGN.md` (full rewrite)

- [ ] **Step 1: Rewrite the frontmatter and body to match the new system**

Replace the entire file with a document structured identically to the current one (frontmatter block with `colors`, `typography`, `rounded`, `spacing`, `components`, followed by the prose sections: Overview, Colors, Typography, Elevation, Components, Do's and Don'ts) but with:
- `colors` frontmatter updated to the new token hex values from Task 1.
- `typography` frontmatter updated to reference Space Grotesk (display), Inter (UI), JetBrains Mono (data) with the exact scale from the spec's Section 2.
- Overview's "Creative North Star" rewritten to describe the violet-identity system instead of "The Friendly Workshop" gray+blue system -- keep the same structural intent (what the UI should feel like, key characteristics) but reflect the new palette, mark, and "on-device/private" positioning from the spec's Section 5 header badge rationale.
- Colors section rewritten with the new named colors (Violet Ink, Violet, Violet Glow, Paper, Mist, Signal Mint) and their roles, replacing Action Green/Active Tool Blue/Blue Surface Tint.
- Named Rules updated: replace "The One Accent Rule" (green=export, blue=active) with a rule reflecting the new system (accent=active/primary action, success=ready state only, canvas stays neutral -- territory rule from spec's opening "regla que manda sobre todo lo demás").
- Typography section rewritten per spec Section 2 (three families, the mono rule spelled out explicitly since it's the cheapest/highest-leverage detail per the spec's own framing).
- Components section updated: Buttons/Tool Buttons/Cards/Inputs/Navigation entries retokenized to new radius values (10px/6px) and new colors; add an explicit "Mark" subsection documenting the anchor-point's 3 sanctioned usages and the rule against using it elsewhere.
- Do's and Don'ts updated: keep the existing don'ts that still apply (no cartoon illustration, no gradients/glassmorphism, no nested cards, WCAG AA minimum) and add the new ones from the spec (canvas is user territory -- no brand color there except the split-view handle; mark appears in exactly 3 places; numbers are always mono).

Write the complete file content (do not leave any section as a stub) -- pull every hex value, type spec, and named rule directly from `docs/superpowers/specs/2026-08-21-violet-brand-reskin-design.md`, which is already complete, so this is a transcription-into-DESIGN.md's-existing-format task, not new design work.

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: rewrite DESIGN.md for violet brand system

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 16: Final full-suite verification

**Files:** none (verification task)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Run the acceptance grep one final time**

Run: `grep -ri "3b82f6\|blue-500\|blue-600" app/ components/ lib/ hooks/`
Expected: no output.

- [ ] **Step 4: Run lint**

Run: `npm run lint` (check `package.json` for the exact script name if this differs)
Expected: no errors.

- [ ] **Step 5: Confirm every acceptance criterion from the spec's Section 8**

Walk the checklist in `docs/superpowers/specs/2026-08-21-violet-brand-reskin-design.md` Section 8 top to bottom, confirming each is satisfied by a specific task above. Any unchecked item at this point is a plan gap -- fix directly rather than deferring.

- [ ] **Step 6: Final commit if any last fixes were made**

```bash
git add -A
git commit -m "fix: final verification pass for violet brand reskin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
