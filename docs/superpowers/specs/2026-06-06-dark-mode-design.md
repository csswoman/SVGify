# Dark Mode — Design

**Date:** 2026-06-06
**Status:** Approved

## Goal

Add a manual dark mode toggle to the SVGcraft app. Default to light; let the user
switch to dark and remember the choice across reloads. Cover the entire app UI.

## Decisions

- **Activation:** Manual toggle in the header (next to the language toggle), default
  light, persisted in `localStorage`. Not auto/system-based.
- **CSS approach:** Tailwind v4 `dark:` variants added alongside existing hardcoded
  colors. No semantic-token refactor.
- **Scope:** Full app — header, footer, all steps (upload, vectorize, colors,
  labels, shape), buttons, tooltips, dropzone, panels.
- **Preview canvases stay light:** The image/SVG preview surfaces keep a light
  background so dark-lined SVGs remain visible. Only the surrounding UI goes dark.

## Architecture — mirror the existing i18n pattern

The app already has `lib/i18n.tsx` (`I18nProvider` + `localStorage` + header toggle).
Dark mode mirrors this exactly for consistency.

### 1. `lib/theme.tsx` (new)
- `ThemeProvider` with state `theme: 'light' | 'dark'`, default `'light'`.
- `useEffect` restores from `localStorage` key `theme` on mount.
- `setTheme(t)` persists to `localStorage` and toggles the `.dark` class on
  `document.documentElement`.
- `useTheme()` hook.

### 2. `app/layout.tsx`
- Inline anti-flash script in `<head>` that reads `localStorage.theme` and applies
  `.dark` to `<html>` **before first paint**, preventing a white flash on load in
  dark mode.
- Body background gets a `dark:` variant.

### 3. `app/globals.css`
Add custom variant so Tailwind v4 keys `dark:` off the `.dark` class instead of
`prefers-color-scheme`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

### 4. `components/shared/AppShell.tsx`
- Wrap tree with `ThemeProvider` (outside `I18nProvider`).
- Add ☀️/🌙 toggle button in the header, same styling as `LangToggle`.

### 5. The 20 views with hardcoded colors
Add `dark:` variants. Consistent mapping:
| Light | Dark |
|-------|------|
| `bg-white` | `dark:bg-gray-800` |
| `bg-gray-100` (body) | `dark:bg-gray-900` |
| `bg-gray-50` | `dark:bg-gray-700/50` |
| `text-gray-900` | `dark:text-gray-100` |
| `text-gray-700` | `dark:text-gray-300` |
| `text-gray-400` | `dark:text-gray-500` |
| `border-gray-200` | `dark:border-gray-700` |

Files: layout.tsx, page.tsx, AppShell, DownloadButton, LoadingState,
StepIndicator, Tooltip, ImageDropzone, UploadStep, ImagePreview, PalettePreview,
SvgPreview, VectorizeSettings, VectorizeStep, ColorEditStep, ColorPicker,
ColorSwatches, LabelInput, LabelSidebar, LabelStep, ShapeEditStep.

**Exception:** preview canvas surfaces keep a fixed light background (handled
per-component during implementation).

## Testing

Visual verification: run the app, toggle both modes, reload to confirm persistence
and absence of flash.
