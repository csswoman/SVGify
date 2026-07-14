---
name: SVGify
description: Free SVG vectorizer — accessible workshop UI for client-side raster-to-SVG conversion
colors:
  action-blue: "#2563eb"
  action-blue-surface: "#eff6ff"
  action-green: "#16a34a"
  action-green-hover: "#15803d"
  canvas-bg: "#f3f4f6"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  ink: "#111827"
  ink-muted: "#6b7280"
  ink-subtle: "#9ca3af"
  border: "#e5e7eb"
  dark-canvas-bg: "#111827"
  dark-surface: "#1f2937"
  dark-ink: "#f3f4f6"
  dark-ink-muted: "#9ca3af"
  dark-border: "#374151"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-green}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.action-green-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  tool-button-active:
    backgroundColor: "{colors.action-blue-surface}"
    textColor: "{colors.action-blue}"
    rounded: "{rounded.sm}"
    padding: "0"
    size: "40px"
  tool-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "0"
    size: "40px"
---

# Design System: SVGify

## Overview

**Creative North Star: "The Friendly Workshop"**

SVGify se presenta como un taller digital accesible: herramientas visibles, controles legibles y un lienzo central que manda. La UI no compite con el trabajo del usuario; lo enmarca con bordes suaves, superficies claras y densidad moderada. El sistema rechaza la estética lúdica (ilustraciones cartoon, colores infantiles) y cualquier capa de marketing que distraiga del flujo de vectorización.

La personalidad es clara y honesta: amigable para perfiles mixtos (diseñadores, desarrolladores, creadores) sin simplificar en exceso. Modo claro por defecto, oscuro opcional. Iconografía Phosphor, sin decoración superflua.

**Key Characteristics:**

- Workspace de tres paneles: toolbar vertical, canvas central, inspector contextual
- Paleta neutra gris + acento azul para estado activo + verde para acción principal (descargar)
- Tipografía Geist Sans para UI, Geist Mono para datos técnicos
- Elevación plana: profundidad por bordes y contraste tonal, no sombras pesadas
- Bilingüe EN/ES integrado en copy y labels

## Colors

Paleta funcional de herramienta: neutros grises como base, azul para selección activa, verde para la acción de exportar.

### Primary

- **Action Green** (#16a34a): Botón principal de descarga y CTAs de completar flujo. Único acento de acción positiva; usar con moderación (una instancia dominante por vista).

### Secondary

- **Active Tool Blue** (#2563eb): Estado activo en toolbar, bordes y texto de herramienta seleccionada. Señala "modo actual" sin dominar toda la superficie.

### Tertiary

- **Blue Surface Tint** (#eff6ff): Fondo de herramienta activa en modo claro. Par con Action Blue para contraste suave.

### Neutral

- **Canvas Gray** (#f3f4f6): Fondo de página y área de trabajo exterior.
- **Surface White** (#ffffff): TopBar, ToolBar, Inspector, StatusBar, footer.
- **Ink** (#111827): Texto principal en modo claro.
- **Ink Muted** (#6b7280): Texto secundario, iconos inactivos, status bar.
- **Ink Subtle** (#9ca3af): Taglines, metadatos de pie.
- **Border Gray** (#e5e7eb): Separadores entre paneles del workspace.
- **Dark Canvas** (#111827): Fondo en modo oscuro.
- **Dark Surface** (#1f2937): Paneles elevados en modo oscuro.
- **Dark Border** (#374151): Separadores en modo oscuro.

### Named Rules

**The One Accent Rule.** Verde solo para acciones de exportar o confirmar. Azul solo para estado activo/selección. No introducir terceros acentos decorativos.

**The Gray Foundation Rule.** El 80%+ de cualquier pantalla es neutro gris/blanco. El color comunica estado o acción, no decoración.

## Typography

**Display Font:** Geist Sans (system-ui fallback)
**Body Font:** Geist Sans (system-ui fallback)
**Label/Mono Font:** Geist Mono (ui-monospace fallback)

**Character:** Sans geométrica moderna, legible en tamaños pequeños. Jerarquía por peso y tamaño, no por familias múltiples.

### Hierarchy

- **Display** (700, 1.125rem / 18px, 1.2): Logo "SVGify" en TopBar. Único uso de bold grande.
- **Headline** (600, 1rem / 16px, 1.4): Títulos de sección en Inspector.
- **Title** (500, 0.875rem / 14px, 1.5): Labels de controles, encabezados de panel.
- **Body** (400, 0.875rem / 14px, 1.5): Copy de ayuda, descripciones en inspector. Máx 65–75ch en bloques de texto.
- **Label** (400, 0.75rem / 12px, 1.4): Status bar, footer, tooltips. Status bar en gray-500.

### Named Rules

**The Single Family Rule.** Geist Sans para toda la UI. Geist Mono solo para valores técnicos (tamaños de archivo, coordenadas). No añadir terceras familias.

## Elevation

Sistema plano por defecto. La profundidad se comunica con bordes (`border-gray-200`), contraste de superficie (white sobre gray-100) y el contenedor del workspace (`rounded-xl border`). Sombras aparecen solo en tooltips (`shadow-lg` en fondo gray-900).

### Shadow Vocabulary

- **Tooltip** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): Tooltips de herramientas únicamente.

### Named Rules

**The Flat-By-Default Rule.** Cards y paneles no llevan sombra en reposo. El workspace es un marco con borde, no una tarjeta flotante.

## Components

### Buttons

- **Shape:** Esquinas suaves (8px en primario, 6px en icon buttons)
- **Primary:** Verde (#16a34a), texto blanco, padding 12px 24px, font-semibold. Hover #15803d.
- **Hover / Focus:** Transición de color (`transition`). Disabled: gray-400 fondo, cursor-not-allowed.
- **Icon / Ghost:** 40×40px, sin fondo en reposo, hover gray-100. Activo: borde blue-600, fondo blue-50.

### Tool Buttons

- **Style:** Icono Phosphor 20px, weight fill cuando activo
- **State:** `aria-pressed` para activo, `aria-disabled` para deshabilitado
- **Tooltip:** Aparece a la derecha tras 400ms, fondo gray-900, texto 11px

### Cards / Containers

- **Corner Style:** 12px (`rounded-xl`) en contenedor workspace
- **Background:** gray-100 exterior, white en barras internas
- **Shadow Strategy:** Sin sombra; borde gray-200
- **Border:** 1px solid en perímetro del workspace y entre paneles
- **Internal Padding:** 16px en inspector (`p-4`), 8px en top bar (`py-2 px-4`)

### Inputs / Fields

- **Style:** Controles nativos y sliders en inspector; bordes gray-200
- **Focus:** Ring o borde azul coherente con tool activo
- **Error / Disabled:** Opacity 40% en herramientas deshabilitadas

### Navigation

- **ToolBar:** Columna vertical 56px (`w-14`), iconos apilados, separadores `h-px w-8` tras grupos lógicos (import | fill | labels)
- **TopBar:** Horizontal, logo izquierda, acciones derecha (undo/redo, tema, idioma, descarga)
- **StatusBar:** Pie del workspace con métricas (paths, bytes, zoom, herramienta activa)

### Workspace Shell

Contenedor principal `h-[calc(100vh-7rem)]` con layout flex: TopBar → (ToolBar + Canvas + Inspector) → StatusBar. Canvas usa patrón checkerboard para preview transparente.

## Do's and Don'ts

### Do:

- **Do** mantener el canvas como foco visual; barras y paneles en neutros discretos.
- **Do** usar verde solo para exportar/confirmar y azul solo para herramienta activa.
- **Do** proveer labels `aria-label` en todos los botones de icono y tooltips con atajos de teclado.
- **Do** respetar modo oscuro en todos los paneles (dark: variants en cada superficie).
- **Do** escribir copy directo: qué hace el control, no marketing vacío.

### Don't:

- **Don't** usar estética demasiado lúdica: ilustraciones cartoon, colores infantiles, mascotas o iconografía juguetona.
- **Don't** añadir gradientes decorativos, glassmorphism o hero-metrics de SaaS genérico.
- **Don't** introducir cards anidadas dentro del workspace; los paneles ya definen la estructura.
- **Don't** usar gray-400 para texto de cuerpo sobre fondos claros; cumplir WCAG 2.1 AA.
- **Don't** añadir eyebrows en mayúsculas tracking-wide sobre cada sección del inspector.
