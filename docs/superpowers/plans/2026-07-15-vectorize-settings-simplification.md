# Plan de implementación: simplificación de ajustes de Vectorizar

> Este plan se ejecuta tarea por tarea. No presupone cambios visuales fuera del inspector de Vectorizar, Optimizar y el copy de producto relacionado con el trazado.

**Objetivo:** Reducir el panel de vectorización a decisiones que un usuario común entiende y puede evaluar en la vista previa, conservar profundidad solo cuando aporta valor real, eliminar controles engañosos o redundantes y alinear la promesa del producto con el pipeline de vectorización existente.

**Resultado esperado:** El flujo principal presenta como máximo cinco decisiones visibles: tipo de imagen, nivel de detalle, cantidad de colores, quitar fondo y paleta. Los parámetros internos de VTracer se derivan de perfiles probados. Ningún control visible puede ser un no-op para el modo activo. La UI deja de prometer procesamiento local y describe el valor real: SVG editable con resultados rápidos y controlables.

**Principio de producto:** Aplicar revelación progresiva: defaults sensatos primero, controles contextuales después y parámetros del motor fuera de la UI. Esto sigue `PRODUCT.md` y el registro de producto definido en `DESIGN.md`.

**Stack afectado:** TypeScript, React 19, Next.js 16 App Router, Web Workers, `@neplex/vectorizer`, SVGO y Vitest.

---

## 1. Diagnóstico que origina el plan

- El panel expone 14 controles de trazado, además de la paleta y la eliminación de fondo.
- No existe telemetría de uso. La prioridad se basa en impacto verificable, convenciones de herramientas de vectorización y el objetivo de producto.
- `Icono` usa `PathSimplifyMode.Polygon`, pero la UI muestra varios parámetros de spline.
- En la imagen de validación del repositorio, cambiar `cornerThreshold`, `lengthThreshold`, `maxIterations` y `spliceThreshold` no alteró el SVG crudo en modo Icono.
- `maxIterations = 0`, permitido actualmente por la UI, produjo `GenericFailure` en el motor instalado.
- Para iconos pequeños, la implementación puede forzar suavizado `2` aunque la UI muestre `0` o `1`, y escala `2x` aunque muestre `1x`.
- `bilateralColorSigma` no interviene en el flujo habitual de Icono cuando existe una paleta.
- `paletteMergeThreshold` aporta valor en Estándar, pero no en Icono y se solapa con Colores y con el editor de paleta.
- `pathPrecision` pertenece principalmente al tamaño/serialización del SVG, no a la decisión de vectorización.
- `VectorizeSettings` contiene aliases y campos heredados que VTracer ignora.
- La UI afirma “Todo local”, pero el worker envía píxeles RGBA comprimidos a `/api/vectorize` para trazarlos en Node.js.

---

## 2. Decisión de producto y UX objetivo

### Controles principales

1. **Tipo de imagen**
   - `Ilustración` — reemplaza la etiqueta ambigua `Estándar`.
   - `Logo o icono` — reemplaza `Icono` con una intención más explícita.

2. **Detalle**
   - `Limpio`
   - `Equilibrado` — predeterminado.
   - `Más detalle`
   - Es un control de producto, no un parámetro directo del motor. Resuelve de forma coordinada limpieza de motas, diferencia de capas y suavizado.

3. **Colores**
   - Mantener los pasos discretos actuales `4, 8, 16, 32, 64, 128`.
   - En `Logo o icono`, iniciar en 8.
   - En `Ilustración`, iniciar en 16.
   - Mantener la sincronización con la paleta sugerida y editable.

4. **Quitar fondo**
   - Mantener como opción contextual.
   - Mostrar Tolerancia y puntos seleccionados solo cuando esté activada.

5. **Paleta**
   - Mantener colapsada hasta que exista una sugerencia o un SVG.
   - Tratarla como edición explícita del resultado, no como parámetro técnico del trazador.

### Controles contextuales

- En `Ilustración`, permitir como máximo:
  - `Suavizar foto ruidosa`.
  - `Esquinas`.
- Para imágenes con canal alpha, permitir `Limpieza de borde transparente` cerca de Quitar fondo.
- En `Logo o icono`, no mostrar ajustes geométricos avanzados mientras el motor use modo poligonal.

### Controles que desaparecen del inspector de Vectorizar

| Control actual | Decisión |
|---|---|
| Unir tonos | Automatizar según cantidad de colores; conservar fusión manual en Paleta/Optimizar |
| Precisión | Mover al comportamiento de los presets de Optimizar |
| Escala de trazado | Resolver automáticamente por dimensiones y modo |
| Preservar bordes | Derivar del perfil de suavizado |
| Diferencia de capa | Derivar del nivel de Detalle |
| Longitud de segmento | Fijar por perfil interno |
| Pasadas de curva | Fijar en un valor válido por perfil; nunca permitir 0 |
| Empalmes de curva | Fijar por perfil interno |

### Dirección visual

- Estrategia de color: restringida, sin cambios a los tokens actuales.
- El lienzo conserva el foco; el inspector reduce densidad y muestra una decisión por bloque.
- Se reutilizan `InspectorDisclosure`, tooltips, botones segmentados y estilos existentes.
- No se agregan cards nuevas ni decoración.

---

## 3. Perfiles internos iniciales

Los valores siguientes son puntos de partida. Deben ajustarse con las imágenes de validación antes de quedar congelados.

| Modo | Detalle | `filterSpeckle` | `layerDifference` | `bilateralRadius` | Geometría |
|---|---:|---:|---:|---:|---|
| Ilustración | Limpio | 12 | 18 | 2 | spline segura |
| Ilustración | Equilibrado | 6 | 10 | 1 | defaults actuales |
| Ilustración | Más detalle | 2 | 6 | 0 | spline conservadora |
| Logo o icono | Limpio | 12 | 18 | automático | polygon |
| Logo o icono | Equilibrado | 4 | 12 | automático | polygon |
| Logo o icono | Más detalle | 1 | 6 | automático | polygon |

Reglas comunes:

- `maxIterations >= 1` siempre.
- `pathPrecision = 2` durante el trazado salvo evidencia visual que justifique otro valor.
- `preprocessingScale` se decide por dimensiones; no se expone.
- `paletteMergeThreshold` se deriva de `resolvePaletteMergeCeiling(colorCount)` en Ilustración y no se usa como setting de Icono.
- Los overrides contextuales solo modifican el parámetro al que hacen referencia; no crean combinaciones imposibles o estados invisibles.

---

## 4. File map previsto

| Archivo | Cambio |
|---|---|
| `types/svg.types.ts` | Separar ajustes de producto de configuración interna; eliminar aliases heredados |
| `lib/vectorizeProfiles.ts` | Nuevo: resolver modo + detalle + contexto a opciones válidas del motor |
| `lib/vectorizeProfiles.test.ts` | Nuevo: contrato y matriz de perfiles |
| `components/vectorize/VectorizeSettings.tsx` | Rehacer el panel con controles principales y contextuales |
| `components/workspace/inspectors/VectorizeInspector.tsx` | Reordenar fondo, paleta y estados condicionales |
| `hooks/useVectorizeSession.ts` | Gestionar settings simplificados, perfil resuelto y transparencia de entrada |
| `workers/vectorizer.worker.ts` | Consumir exclusivamente configuración interna resuelta y conservar el transporte actual al servicio de vectorización |
| `lib/iconModeSettings.ts` | Reducir o absorber funciones en el resolvedor de perfiles |
| `app/api/vectorize/route.ts` | Mantener el trazado Node existente y validar sus límites de entrada y error |
| `lib/vectorizePayload.ts` | Mantener el transporte de píxeles mientras sea el contrato del worker y cubrirlo con pruebas |
| `components/workspace/inspectors/OptimizeInspector.tsx` | Aplicar precisión por preset de exportación |
| `lib/i18n.tsx` | Copy EN/ES para nuevas etiquetas y eliminación de copy obsoleto |
| `components/workspace/TopBar.tsx` | Sustituir la garantía local por el beneficio verificable de SVG editable |
| `lib/iconOnlyProduct.test.ts` | Actualizar el contrato del inspector de Icono |
| `lib/vectorizePayload.test.ts` | Mantener el contrato del transporte actual |

---

## 5. Plan de implementación

### Tarea 1: Congelar una línea base verificable

**Objetivo:** Evitar que la simplificación de la UI cambie silenciosamente la calidad del trazado.

- [x] Identificar una matriz mínima de fixtures:
  - `public/validation-icon.png` para Logo o icono.
  - Una ilustración con varios colores y sombreado.
  - Una foto con ruido/JPEG.
  - Un PNG transparente con halo semitransparente.
  - Una imagen donde el blanco sea contenido, no fondo.
- [x] Añadir fixtures faltantes a un directorio de test explícito; no depender de archivos de `out/`.
- [x] Crear un helper de diagnóstico que reporte por resultado:
  - hash del SVG;
  - cantidad de paths;
  - cantidad de colores;
  - bytes;
  - tiempo de trazado;
  - error o timeout.
- [x] Guardar métricas base para los defaults actuales de Ilustración e Icono.
- [x] Ejecutar el fixture de Icono con los tres perfiles y comprobar SVG válido y progresión de paths.
- [x] Añadir una prueba que demuestre que `maxIterations = 0` se normaliza a un valor válido antes del trazado, tanto en el perfil como en el worker.
- [ ] Añadir una prueba de comportamiento, no un snapshot frágil, para cada control que se conservará.

**Criterio de aceptación:** Existe una matriz repetible que permite comparar antes/después sin inspección manual como única evidencia.

---

### Tarea 2: Separar ajustes de producto y configuración del motor

**Objetivo:** Evitar que el estado de React y la UI transporten detalles internos o aliases heredados.

- [x] Definir un modelo inicial de ajustes de producto con:
  - modo;
  - nivel de detalle;
  - cantidad de colores;
  - overrides contextuales permitidos;
  - paleta personalizada.
- [ ] Definir por separado el tipo interno enviado al trazador.
- [x] Crear `applyVectorizeProfile()` como punto de traducción de modo + detalle a opciones válidas del motor.
- [x] Centralizar en ese resolvedor los clamps de perfiles y la regla de `maxIterations`.
- [x] Asegurar que Icono no muestre opciones de spline como configurables.
- [x] Hacer que el resolvedor fuerce `maxIterations >= 1`.
- [ ] Eliminar de `VectorizeSettings` los campos heredados e ignorados:
  - `ltres`, `qtres`, `strokewidth`, `linePathOmit`, `blurDelta`, `fillOverlap`, `lineSmoothing`, `curveSmoothing`;
  - aliases `pathomit`, `roundcoords`, `blurRadius`, `traceScale` si ya existe un campo canónico.
- [ ] Actualizar tests y consumidores hasta que no exista escritura doble de campo canónico + alias.

**Criterio de aceptación:** La UI no puede construir una configuración inválida y no hay comentarios `legacy, ignored by vtracer` dentro del contrato activo.

---

### Tarea 3: Implementar los perfiles Limpio / Equilibrado / Más detalle

**Objetivo:** Sustituir varios sliders técnicos por una sola decisión comprensible.

- [x] Implementar los seis perfiles iniciales de la tabla de este documento.
- [x] Ejecutar la matriz disponible de fixtures para cada perfil.
- [ ] Ajustar valores si un perfil:
  - pierde la silueta principal;
  - aumenta paths respecto al nivel anterior cuando debería limpiar;
  - elimina colores importantes;
  - supera el timeout actual.
- [x] Verificar progresión monotónica esperada en el fixture de Icono:
  - Limpio produce igual o menos paths/colores que Equilibrado;
  - Más detalle conserva igual o más detalle que Equilibrado;
  - ningún perfil produce un error.
- [ ] Documentar los valores finales junto al resolvedor, no dentro del componente React.

**Criterio de aceptación:** Cada etiqueta describe un cambio visible y medible, sin exigir al usuario entender VTracer.

---

### Tarea 4: Simplificar el inspector de Vectorizar

**Objetivo:** Reducir la carga cognitiva y mostrar únicamente decisiones con efecto para el modo activo.

- [x] Sustituir `Estándar` por `Ilustración` y `Icono` por `Logo o icono` en EN/ES.
- [x] Mantener el selector de modo como control segmentado de dos opciones.
- [x] Añadir el selector de Detalle con tres opciones y `Equilibrado` como default.
- [x] Mantener Colores con pasos discretos y resumen legible.
- [x] Eliminar del JSX los controles declarados fuera del inspector.
- [x] En Ilustración, mostrar un disclosure contextual con un máximo de dos ajustes:
  - Suavizar foto ruidosa;
  - Esquinas.
- [x] En Logo o icono, ocultar por completo esos ajustes geométricos mientras use `Polygon`.
- [x] Mantener Quitar fondo fuera del grupo de calidad, porque modifica el contenido de entrada.
- [ ] Mostrar Tolerancia solo cuando Quitar fondo esté activo.
- [x] Mostrar Limpieza de borde transparente junto a Quitar fondo solo cuando se detecten píxeles con `0 < alpha < 255`.
- [x] Mantener Paleta después de los controles principales y colapsada por defecto.
- [x] Actualizar summaries para que indiquen decisiones de producto, por ejemplo `16 colores · Equilibrado`.
- [x] Eliminar claves i18n sin consumidores tras verificar EN/ES.

**Criterio de aceptación:** Al abrir Vectorizar se ven como máximo Modo, Detalle, Colores, Quitar fondo y Paleta. No aparece ningún control sin efecto.

---

### Tarea 5: Mover Precisión al flujo de Optimizar

**Objetivo:** Ubicar el redondeo de coordenadas donde el usuario decide peso y preparación de exportación.

- [x] Retirar Precisión del inspector de Vectorizar.
- [x] Mantener precisión interna estable durante el trazado para no alterar geometría de manera accidental.
- [x] Hacer que los presets actuales de Optimizar controlen `coordDecimals`:
  - Más liviano: comenzar con 0;
  - Equilibrado: comenzar con 1;
  - Más detalle: comenzar con 2.
- [ ] Verificar visualmente el preset Más liviano antes de confirmar `0`; subir a `1` si deforma formas pequeñas.
- [ ] Mostrar el ahorro de bytes existente después de Preparar.
- [ ] Evitar añadir un nuevo slider si los tres presets explican suficientemente el tradeoff.

**Criterio de aceptación:** La vectorización no habla de decimales; Optimizar controla el peso final y comunica el resultado.

---

### Tarea 6: Corregir comportamientos engañosos del modo Icono

**Objetivo:** Alinear UI, valores efectivos y copy.

- [ ] Eliminar cualquier visualización de escala `1x/2x` si el sistema la decide automáticamente.
- [ ] Eliminar la promesa `0 = apagado` de suavizado en Icono mientras exista un mínimo forzado.
- [ ] Resolver suavizado automático con una función cuyo nombre comunique que es una política interna.
- [ ] Asegurar que `bilateralColorSigma` no forme parte de ajustes de producto en Icono.
- [ ] Asegurar que Unir tonos no se aplique ni se muestre como control de Icono.
- [ ] Mantener una sola fuente de verdad para la cantidad de colores y la paleta enviada.
- [ ] Añadir tests que cambien todos los controles visibles y confirmen que cada uno modifica el perfil o el raster de entrada.

**Criterio de aceptación:** No existe divergencia conocida entre el valor mostrado y el valor realmente usado.

---

### Tarea 7: Alinear la promesa de producto con el pipeline actual

**Objetivo:** Mantener el trazado servidor/worker que ya funciona y eliminar afirmaciones de privacidad o arquitectura que no son verificables en la UI.

- [x] Sustituir “Todo local” y “Tu imagen se queda en este dispositivo” por el beneficio verificable de SVG editable.
- [x] Actualizar `README.md`, `PRODUCT.md` y `DESIGN.md` para no afirmar procesamiento 100% client-side, ausencia de backend o que los archivos nunca salen del dispositivo.
- [ ] Mantener `fetch('/api/vectorize')`, el payload RGBA comprimido y `app/api/vectorize/route.ts` como parte explícita del contrato actual.
- [ ] Verificar límites de tamaño, cancelación, timeout y mensajes de error del trayecto worker → servicio → SVG.
- [ ] Documentar el comportamiento de procesamiento y retención de datos solo cuando haya una política operativa verificable.
- [ ] Evitar reintroducir sellos o frases de privacidad que no estén respaldados por la arquitectura y las políticas desplegadas.

**Criterio de aceptación:** El producto no promete “todo local” ni ausencia de red; el pipeline existente sigue funcionando y el valor comunicado es un SVG editable y listo para producción.

---

### Tarea 8: Limpieza de código y compatibilidad

**Objetivo:** Terminar la migración sin mantener dos modelos de settings.

- [ ] Eliminar funciones y constantes de `iconModeSettings.ts` absorbidas por los perfiles.
- [ ] Actualizar `useVectorizeSession` para persistir solo ajustes de producto.
- [ ] Revisar que el cambio de modo restablezca únicamente valores dependientes del modo y no borre la paleta sin necesidad.
- [x] Cancelar el trazado anterior al cambiar rápidamente Modo, Detalle o Colores.
- [x] Evitar reemplazar el SVG válido por `null` durante cada ajuste; conservar el último resultado mientras se procesa el nuevo si no causa inconsistencias.
- [x] Actualizar errores para mencionar las nuevas decisiones: menos colores, modo adecuado o nivel más limpio.
- [ ] Eliminar claves i18n, comentarios y tests referidos a la antigua promesa local.
- [ ] Confirmar que no quedan aliases legacy y que el endpoint mantiene un único contrato documentado.

**Criterio de aceptación:** Búsqueda global limpia de campos eliminados y un único camino desde UI → perfil → worker → SVG.

---

### Tarea 9: Accesibilidad, responsive y estados

**Objetivo:** Simplificar sin perder accesibilidad ni feedback.

- [ ] Mantener targets táctiles mínimos de 44 px en selectores segmentados.
- [ ] Usar `aria-pressed` o radios semánticos para Modo y Detalle.
- [ ] Anunciar `Vectorizando…` y errores con regiones live existentes.
- [ ] Mantener foco visible en todos los controles.
- [ ] Verificar navegación completa por teclado.
- [ ] Verificar EN y ES con textos largos y panel estrecho.
- [ ] Verificar modo claro y oscuro.
- [ ] Verificar zoom de navegador al 200% sin scroll horizontal del inspector.
- [ ] Mantener el último SVG visible mientras se recalcula y distinguir claramente estado “actualizando”.
- [ ] No añadir animación decorativa; respetar `prefers-reduced-motion`.

**Criterio de aceptación:** El flujo principal puede completarse con teclado y a 200% de zoom, con el mismo conjunto reducido de decisiones.

---

### Tarea 10: Verificación final y rollout

- [ ] Ejecutar `npm test`.
- [ ] Ejecutar `npm run type-check`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.
- [ ] Probar manualmente cada fixture con los seis perfiles.
- [ ] Comparar original/SVG a zoom 100%, 200% y 400%.
- [ ] Registrar paths, colores, bytes y tiempo antes/después.
- [ ] Confirmar que cada control visible cambia el resultado o el raster de entrada.
- [ ] Confirmar que ningún valor permitido produce error.
- [ ] Confirmar que la ruta `/api/vectorize` procesa correctamente cada fixture y devuelve errores recuperables.
- [ ] Verificar descarga SVG después de editar colores, paths y etiquetas.
- [ ] Actualizar `README.md`, `PRODUCT.md` o copy público solo si la arquitectura final respalda literalmente sus afirmaciones.

---

## 6. Criterios globales de éxito

- El inspector pasa de 14 controles técnicos a 3 controles principales de trazado, más Fondo y Paleta.
- Ningún control visible es ignorado por el modo activo.
- No se puede enviar `maxIterations = 0` al motor.
- Los perfiles producen una progresión coherente de limpieza/detalle.
- El usuario común puede conseguir un resultado razonable sin abrir controles contextuales.
- El usuario avanzado conserva Esquinas, suavizado de foto, paleta y optimización donde corresponden.
- El contrato de settings no contiene aliases heredados ni opciones ignoradas.
- El SVG equilibrado no empeora de forma significativa frente al default actual en la matriz de fixtures.
- La app no promete procesamiento local; el copy público coincide con el pipeline desplegado.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un perfil de tres niveles oculta demasiado control | Mantener dos controles contextuales solo en Ilustración y conservar edición de paleta/Optimizar |
| Limpio elimina detalles pequeños importantes | Fixture específico, métricas monotónicas y comparación visual antes de congelar valores |
| Más detalle produce SVG enormes | Mantener warnings de complejidad y preparar descarga en Optimizar |
| El servicio añade latencia o falla temporalmente | Worker cancelable, límites de dimensión, timeout, errores recuperables y mantener el último SVG válido |
| Cambiar settings rompe sesiones o tests antiguos | Migración atómica del contrato; no mantener aliases indefinidamente |
| El copy de privacidad se adelanta a la arquitectura | Mantener beneficios verificables en la UI y revisar las afirmaciones de procesamiento antes de publicarlas |

---

## 8. Fuera de alcance

- Añadir nuevos modos como blanco y negro, line art o fotografía fotorrealista.
- Rediseñar el canvas o las herramientas de edición de paths.
- Añadir telemetría de uso sin una revisión separada de privacidad y consentimiento.
- Cambiar la identidad visual, tokens o estructura general del workspace.
- Buscar paridad completa con todos los controles avanzados de Illustrator o Inkscape.
- Migrar el motor actual a vectorización completamente local en el navegador.
