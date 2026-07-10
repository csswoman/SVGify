'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'es';

// Translation dictionary. Keys are dotted; values per language.
const DICT = {
  // Header / footer
  'app.tagline': { en: 'Free · Open Source · 100% client-side', es: 'Gratis · Código abierto · 100% en tu navegador' },
  'app.footer': { en: 'Your images never leave your device', es: 'Tus imágenes nunca salen de tu dispositivo' },
  'app.source': { en: 'Source on GitHub', es: 'Código en GitHub' },
  'lang.toggle': { en: 'EN ▾', es: 'ES ▾' },
  'lang.current': { en: 'English', es: 'Español' },
  'theme.switchToDark': { en: 'Switch to dark mode', es: 'Cambiar a modo oscuro' },
  'theme.switchToLight': { en: 'Switch to light mode', es: 'Cambiar a modo claro' },
  'theme.switchLang': { en: 'Switch language', es: 'Cambiar idioma' },

  // Errors
  'error.title': { en: 'Something went wrong', es: 'Algo salió mal' },
  'error.unknown': { en: 'Unknown error', es: 'Error desconocido' },
  'error.tryAgain': { en: 'Try again', es: 'Intentar de nuevo' },

  // Steps / wizard
  'nav.back': { en: '← Back', es: '← Atrás' },

  // Upload
  'upload.title': { en: 'Upload Image', es: 'Subir imagen' },
  'upload.subtitle': { en: 'Convert a raster image to a scalable SVG vector.', es: 'Convierte una imagen en un vector SVG escalable.' },
  'upload.privacy': { en: 'Your image never leaves your device. All processing is 100% client-side.', es: 'Tu imagen nunca sale de tu dispositivo. Todo el procesamiento es 100% en tu navegador.' },
  'upload.drop': { en: 'Drag & drop an image here, or click to browse', es: 'Arrastra una imagen aquí, o haz clic para elegir' },
  'upload.formats': { en: 'PNG, JPG or WEBP · up to 10 MB', es: 'PNG, JPG o WEBP · hasta 10 MB' },

  // Vectorize
  'vec.title': { en: 'Vectorize', es: 'Vectorizar' },
  'vec.subtitle': { en: 'Live preview.', es: 'Vista previa en vivo.' },
  'vec.original': { en: 'Original', es: 'Original' },
  'vec.originalPick': { en: 'Original — click background to remove', es: 'Original — clic en el fondo para quitarlo' },
  'vec.showOriginal': { en: 'Show original', es: 'Ver original' },
  'vec.hideOriginal': { en: 'Hide original', es: 'Ocultar original' },
  'vec.vector': { en: 'Vector SVG', es: 'SVG vectorial' },
  'vec.notTracedYet': { en: 'Preview - not traced yet', es: 'Vista previa - aún sin trazar' },
  'vec.palette': { en: 'Palette', es: 'Paleta' },
  'vec.colors': { en: 'colors', es: 'colores' },
  'vec.color': { en: 'color', es: 'color' },
  'vec.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'vec.continue': { en: 'Continue to Colors →', es: 'Continuar a Colores →' },
  'vec.revectorize': { en: 'Re-vectorize now', es: 'Re-vectorizar ahora' },
  'vec.auto': { en: 'Live preview.', es: 'Vista previa en vivo.' },
  'vec.vectorizing': { en: 'Vectorizing…', es: 'Vectorizando…' },
  'vec.optimized': { en: 'optimized', es: 'optimizado' },
  'vec.paletteEditor': { en: 'Clean icon palette', es: 'Paleta del icono limpio' },
  'vec.palettePreviewHint': { en: "Colors we'll trace with — fine-tune later in Fill", es: 'Colores que trazaremos — afina luego en Fill' },
  'vec.readyHint': { en: 'Your SVG is ready — download it, or refine colors below.', es: 'Tu SVG ya está listo — descárgalo o afina los colores abajo.' },
  'vec.paletteEditor.help': { en: 'These colors come from your image. Edit, delete, or merge them before tracing.', es: 'Estos colores salen de tu imagen. Edítalos, bórralos o une parecidos antes de trazar.' },
  'vec.paletteMerge': { en: 'Merge similar', es: 'Unir parecidos' },
  'vec.paletteReset': { en: 'Reset suggestion', es: 'Restaurar sugerencia' },
  'vec.refineColors': { en: 'Refine colors', es: 'Afinar colores' },
  'vec.maxOptimize': { en: '⚡ Optimize to the max', es: '⚡ Optimizar al máximo' },
  'vec.maxOptimize.help': { en: 'Extra compression only: flattens curves to straight segments (Douglas–Peucker). Smaller file, but corners look chunkier. Skip this if you want the sharpest default preview.', es: 'Compresión extra: aplana curvas a segmentos rectos (Douglas–Peucker). Archivo más ligero, pero las esquinas se ven más toscas. Omítelo si quieres la vista previa más nítida.' },
  'vec.cleanFragments': { en: '🧹 Clean fragments', es: '🧹 Limpiar fragmentos' },
  'vec.cleanFragments.help': { en: 'Removes tiny near-white speckles and other small stray paths at the edges — fixes background halos without changing the main shapes.', es: 'Elimina motas blancas diminutas y otros paths sueltos en los bordes — corrige halos del fondo sin alterar las formas principales.' },
  'zoom.panHint': { en: 'Space + drag, Alt + drag, or middle mouse to pan. Use +/− controls to zoom.', es: 'Espacio + arrastrar, Alt + arrastrar o botón central para mover. Usa +/− para el zoom.' },
  'set.smoothing.help': { en: 'Higher simplifies and straightens edges (lighter file, chunkier corners); lower keeps curves faithful and sharper.', es: 'Más alto simplifica y endereza bordes (archivo más ligero, esquinas más toscas); más bajo mantiene curvas fieles y más nítidas.' },
  'set.detail.help': { en: 'Higher simplifies curves (lighter file, more angular); lower preserves smooth rounded detail.', es: 'Más alto simplifica curvas (archivo más ligero, más angular); más bajo conserva detalle redondeado y suave.' },
  'vec.complexWarn': { en: 'This icon produced many shapes. Try fewer colors, more noise removal, or “Optimize to the max” to keep the SVG lightweight.', es: 'Este icono generó muchas formas. Prueba menos colores, más “quitar ruido” u “Optimizar al máximo” para mantener el SVG liviano.' },

  // Settings groups
  'set.basic': { en: 'Basic', es: 'Básico' },
  'set.advanced': { en: 'Advanced', es: 'Avanzado' },
  // Settings controls
  'set.traceMode': { en: 'Mode', es: 'Modo' },
  'set.traceMode.help': { en: 'Standard uses the current settings. Icon flattens the image to the palette before tracing, then uses the same vectorizer.', es: 'Estándar usa la configuración actual. Icono aplana la imagen a la paleta antes de trazar y luego usa el mismo vectorizador.' },
  'set.traceMode.standard': { en: 'Standard', es: 'Estándar' },
  'set.traceMode.icon': { en: 'Icon', es: 'Icono' },
  'set.traceMode.icon.help': { en: 'Use for flat logos, icons, UI assets and simple illustrations. It removes anti-aliased color noise before VTracer sees the image.', es: 'Úsalo para logos planos, iconos, assets de UI e ilustraciones simples. Elimina ruido de color y anti-alias antes de que VTracer vea la imagen.' },
  'set.colors': { en: 'Colors', es: 'Colores' },
  'set.colors.levels': { en: '4 = 16 colors · 5 = 32 colors · 6 = 64 colors · 7 = 128 colors', es: '4 = 16 colores · 5 = 32 colores · 6 = 64 colores · 7 = 128 colores' },
  'set.colors.hint': { en: 'Default: 16 colors', es: 'Predeterminado: 16 colores' },
  'set.colors.help': { en: 'Approximate palette cap for tracing. Start low for cleaner SVGs; raise it only when important colors disappear. 4 = 16 colors, 5 = 32, 6 = 64, 7 = 128.', es: 'Límite aproximado de paleta para el trazado. Empieza bajo para SVG más limpios; súbelo solo si desaparecen colores importantes. 4 = 16 colores, 5 = 32, 6 = 64, 7 = 128.' },
  'set.icon.hint': { en: 'Best for icon assets: preserves accent colors and reduces noisy paths. Use Remove background only when you need it.', es: 'Ideal para assets de iconos: conserva acentos de color y reduce paths ruidosos. Usa Quitar fondo solo cuando lo necesites.' },
  'set.quantCycles': { en: 'Palette cycles', es: 'Ciclos de paleta' },
  'set.quantCycles.help': { en: 'Refines the suggested palette toward the source colors. Higher improves fidelity but costs more processing time.', es: 'Refina la paleta sugerida hacia los colores originales. Más alto mejora fidelidad con mayor costo de proceso.' },
  'set.colorPrecision': { en: 'Color detail', es: 'Detalle de color' },
  'set.colorPrecision.help': { en: 'Significant RGB bits used by VTracer. 4 is the default for clean icon output; higher values keep more shaded bands. 4 = 16 colors, 5 = 32, 6 = 64, 7 = 128.', es: 'Bits RGB significativos usados por VTracer. 4 es el predeterminado para iconos limpios; valores más altos conservan más bandas de sombreado. 4 = 16 colores, 5 = 32, 6 = 64, 7 = 128.' },
  'set.smoothing': { en: 'Smoothing', es: 'Suavizado' },
  'set.detail': { en: 'Detail', es: 'Detalle' },
  'set.stroke': { en: 'Stroke width', es: 'Grosor de borde' },
  'set.stroke.help': { en: 'Legacy setting from the previous tracer. VTracer stacked layers now seal shapes without same-color strokes.', es: 'Opción heredada del tracer anterior. Las capas stacked de VTracer sellan las formas sin bordes del mismo color.' },
  'set.noise': { en: 'Noise removal', es: 'Quitar ruido' },
  'set.noise.hint': { en: 'Use low/medium for cleaner detail. The app compresses size automatically.', es: 'Usa bajo/medio para conservar detalle. La app comprime el tamaño automáticamente.' },
  'set.noise.help': { en: 'VTracer speckle filter. Raise it to 6-8 if tiny shards remain; too high can erase useful details.', es: 'Filtro de motas de VTracer. Súbelo a 6-8 si quedan astillas; muy alto puede borrar detalles útiles.' },
  'set.lineNoise': { en: 'Outline noise', es: 'Ruido de contorno' },
  'set.lineNoise.help': { en: 'Speckle filtering for dark outline layers only. Keep it low so short line segments are not erased.', es: 'Filtro de motas solo para capas oscuras de contorno. Mantenlo bajo para no borrar segmentos cortos de línea.' },
  'set.traceScale': { en: 'Trace scale', es: 'Escala de trazado' },
  'set.traceScale.help': { en: 'Upscales the raster before VTracer. 2x gives smoother line-art at higher processing cost.', es: 'Escala el raster antes de VTracer. 2x suaviza mejor el line-art con más costo de proceso.' },
  'set.blurDelta': { en: 'Blur delta', es: 'Delta de desenfoque' },
  'set.blurDelta.help': { en: 'Edge threshold used by the tracer blur. Lower follows subtle edges; higher ignores weak blur transitions.', es: 'Umbral de borde usado por el desenfoque del tracer. Más bajo sigue bordes sutiles; más alto ignora transiciones débiles.' },
  'set.precision': { en: 'Precision', es: 'Precisión' },
  'set.precision.hint': { en: 'Lower = fewer decimals → smaller file.', es: 'Más bajo = menos decimales → archivo más ligero.' },
  'set.precision.help': { en: 'VTracer path coordinate decimals. Lower = smaller file with a small loss of precision.', es: 'Decimales de coordenadas de VTracer. Más bajo = archivo más ligero con una pequeña pérdida de precisión.' },
  'set.cornerThreshold': { en: 'Corner threshold', es: 'Umbral de esquina' },
  'set.cornerThreshold.help': { en: 'Minimum angle VTracer treats as a corner. Higher creates fewer false corners and smoother line art.', es: 'Ángulo mínimo que VTracer trata como esquina. Más alto crea menos esquinas falsas y line art más suave.' },
  'set.bilateralSigma': { en: 'Edge preserve', es: 'Preservar bordes' },
  'set.bilateralSigma.help': { en: 'Color threshold for the bilateral prefilter. Lower preserves hard edges; higher smooths more noise.', es: 'Umbral de color del prefiltro bilateral. Más bajo preserva bordes duros; más alto suaviza más ruido.' },
  'set.alphaThreshold': { en: 'Edge cleanup', es: 'Limpieza de borde' },
  'set.alphaThreshold.help': { en: 'Removes semi-transparent fringe pixels before tracing. Raise it if pale dots appear around transparent edges; lower it if edges look clipped.', es: 'Elimina píxeles semitransparentes del borde antes de trazar. Súbelo si aparecen puntos claros alrededor de bordes transparentes; bájalo si el borde se recorta.' },
  'set.paletteMerge': { en: 'Merge shades', es: 'Unir tonos' },
  'set.paletteMerge.help': { en: 'Collapses very similar traced colors before the palette cap. Higher values reduce palette count and SVG size, but can flatten subtle shading.', es: 'Une colores vectorizados muy parecidos antes del límite de paleta. Valores más altos reducen colores y peso, pero pueden aplanar sombreado sutil.' },
  'set.layerDifference': { en: 'Layer difference', es: 'Diferencia de capa' },
  'set.layerDifference.help': { en: 'Color difference between VTracer layers. Higher reduces gradient bands and file size.', es: 'Diferencia de color entre capas de VTracer. Más alto reduce bandas de degradado y peso.' },
  'set.lengthThreshold': { en: 'Segment length', es: 'Longitud de segmento' },
  'set.lengthThreshold.help': { en: 'Spline subdivision threshold. Lower can follow detail more closely; higher simplifies paths.', es: 'Umbral de subdivisión de spline. Más bajo sigue más detalle; más alto simplifica paths.' },
  'set.maxIterations': { en: 'Spline iterations', es: 'Iteraciones spline' },
  'set.maxIterations.help': { en: 'Maximum VTracer smoothing iterations for spline fitting.', es: 'Máximo de iteraciones de suavizado de VTracer para ajustar splines.' },
  'set.spliceThreshold': { en: 'Splice threshold', es: 'Umbral de empalme' },
  'set.spliceThreshold.help': { en: 'Minimum angle displacement to splice a spline. Higher can simplify curves more aggressively.', es: 'Desplazamiento angular mínimo para empalmar un spline. Más alto puede simplificar curvas con más fuerza.' },
  'set.fillOverlap': { en: 'Fill overlap', es: 'Solape de relleno' },
  'set.fillOverlap.help': { en: 'Expands fill masks under outlines before tracing. Higher seals gaps, but too high can thicken small details.', es: 'Expande los rellenos debajo del contorno antes de trazar. Más alto sella huecos, pero demasiado puede engordar detalles pequeños.' },
  'set.lineSmoothing': { en: 'Line cleanup', es: 'Limpieza de línea' },
  'set.lineSmoothing.help': { en: 'Removes isolated dark fragments from outline masks before tracing. Higher reduces broken edges, but can erase tiny line details.', es: 'Elimina fragmentos oscuros aislados de las máscaras de contorno antes de trazar. Más alto reduce bordes rotos, pero puede borrar detalles finos.' },
  'set.curveSmoothing': { en: 'Curve smoothing', es: 'Suavizado de curvas' },
  'set.curveSmoothing.help': { en: 'Converts jagged polygon outlines into quadratic curves after tracing. 0 keeps raw polygons; 1 is balanced; 2 is smoother.', es: 'Convierte contornos poligonales dentados en curvas cuadráticas después del trazado. 0 conserva polígonos; 1 es balanceado; 2 es más suave.' },

  // Blur
  'set.blur': { en: 'Pre-blur', es: 'Desenfoque previo' },
  'set.blur.hint': { en: '0 = off · 1 = default · 2-3 smooths noisy images more.', es: '0 = apagado · 1 = predeterminado · 2-3 suaviza más imágenes ruidosas.' },
  'set.blur.help': { en: 'Applies a bilateral filter before tracing. It smooths noise while preserving edges better than Gaussian blur.', es: 'Aplica un filtro bilateral antes de trazar. Suaviza ruido y preserva bordes mejor que un gaussiano.' },

  // Background removal
  'bg.remove': { en: 'Remove background', es: 'Quitar fondo' },
  'bg.auto': { en: 'Auto mode removes the background from the image corners.', es: 'El modo automático quita el fondo detectado en las esquinas.' },
  'bg.auto.help': { en: 'Click the image background to pick a specific color instead of using auto mode.', es: 'Haz clic en el fondo de la imagen para elegir un color específico en vez del modo automático.' },
  'bg.picking': { en: 'Removing the color you clicked. Both previews update automatically. Add more clicks to remove other background areas.', es: 'Quitando el color que tocaste. Ambas vistas se actualizan solas. Haz más clics para quitar otras zonas del fondo.' },
  'bg.contiguous': { en: 'Contiguous', es: 'Contiguo' },
  'bg.contiguous.help': { en: 'On: removes only the connected area touching your click. Off: removes that color everywhere in the image.', es: 'Activado: quita solo la zona conectada a tu clic. Desactivado: quita ese color en toda la imagen.' },
  'bg.tolerance': { en: 'Tolerance', es: 'Tolerancia' },
  'bg.tolerance.help': { en: 'How close a pixel must be to the picked color to be removed. Higher removes more shades.', es: 'Cuán cercano debe ser un píxel al color elegido para quitarlo. Más alto quita más tonos.' },
  'bg.tolerance.hint': { en: 'Higher = removes more shades of the picked color.', es: 'Más alto = quita más tonos del color elegido.' },
  'bg.clear': { en: 'Clear picked points', es: 'Limpiar puntos elegidos' },

  // Color editor
  'col.title': { en: 'Edit Colors', es: 'Editar colores' },
  'col.subtitle': { en: 'Pick a fill color from the canvas with the eyedropper, then choose a replacement.', es: 'Recoge un color de relleno del lienzo con el cuentagotas, luego elige uno nuevo.' },
  'col.eyedropperHint': { en: 'Click a shape in the canvas to pick its fill color.', es: 'Haz clic en una forma del lienzo para recoger su color de relleno.' },
  'col.eyedropperEmpty': { en: 'No color picked yet.', es: 'Aún no has recogido ningún color.' },
  'col.useAsFill': { en: 'Use as fill', es: 'Usar como relleno' },
  'col.eraseSub': { en: 'Erase mode: click any shape in the preview to delete it.', es: 'Modo borrar: haz clic en cualquier forma del preview para eliminarla.' },
  'col.undo': { en: 'Undo', es: 'Deshacer' },
  'col.redo': { en: 'Redo', es: 'Rehacer' },
  'col.erase': { en: 'Erase path mode', es: 'Modo borrar forma' },
  'col.erase.help': { en: 'When on, clicking a shape in the preview deletes it. Turn off to go back to editing colors.', es: 'Cuando está activo, al hacer clic en una forma se elimina. Desactívalo para volver a editar colores.' },
  'col.merge': { en: 'Merge similar colors', es: 'Unir colores parecidos' },
  'col.merge.help': { en: 'Combines shades that are close in color into one. Raise the value for a more logo-like palette; lower it to preserve distinct colors.', es: 'Combina tonos parecidos en uno. Sube el valor para una paleta más tipo logo; bájalo para conservar colores distintos.' },
  'col.mergeBtn': { en: 'Merge similar', es: 'Unir parecidos' },
  'col.reduce': { en: 'Reduce to colors', es: 'Reducir a colores' },
  'col.reduce.help': { en: 'Forces the palette down to exactly this many colors by merging the closest ones.', es: 'Fuerza la paleta a exactamente esta cantidad de colores uniendo los más cercanos.' },
  'col.reduceBtn': { en: 'Reduce to', es: 'Reducir a' },
  'col.normalize': { en: '🎨 Normalize palette', es: '🎨 Normalizar paleta' },
  'col.normalize.help': { en: 'Cleans up the palette in one click: groups all the near-duplicate shades (e.g. a dozen beiges) into a few clean, distinct colors. Best starting point before fine-tuning.', es: 'Limpia la paleta de un clic: agrupa todos los tonos casi iguales (p. ej. una docena de beiges) en unos pocos colores limpios y distintos. El mejor punto de partida antes de afinar.' },
  'col.snapBlack': { en: 'Dark → black threshold', es: 'Umbral oscuros → negro' },
  'col.snapBlack.help': { en: 'Converts every dark color below this brightness to pure #000. Collapses the many near-black shades into one clean black. Higher = catches lighter darks too.', es: 'Convierte a #000 puro todo color oscuro por debajo de este brillo. Une los muchos tonos casi negros en un solo negro limpio. Más alto = también captura oscuros más claros.' },
  'col.snapBlackBtn': { en: '⬛ Snap darks to #000', es: '⬛ Unir oscuros a #000' },
  'col.autoSimplify': { en: '✨ Auto-simplify (keep vivid colors)', es: '✨ Simplificar automático (conservar colores vivos)' },
  'col.autoSimplify.help': { en: 'Collapses dull near-duplicate tones (like many near-blacks) first, keeping primary and secondary colors. Reduces to the count set below.', es: 'Une primero los tonos apagados casi iguales (como muchos negros parecidos), conservando los colores primarios y secundarios. Reduce a la cantidad indicada abajo.' },
  'col.holdOriginal': { en: '👁 Hold to see original', es: '👁 Mantén pulsado para ver el original' },
  'col.showingOriginal': { en: 'Showing original', es: 'Mostrando original' },
  'col.showingEdited': { en: 'Showing edited', es: 'Mostrando editado' },
  'col.originalColors': { en: 'Original colors', es: 'Colores originales' },
  'col.originalColors.help': { en: 'The colors the image had when you entered this step. Click one to reapply it.', es: 'Los colores que tenía la imagen al entrar a este paso. Haz clic en uno para reaplicarlo.' },
  'col.paletteTitle': { en: 'Palette', es: 'Paleta' },
  'col.noColors': { en: 'No colors found.', es: 'No se encontraron colores.' },
  'col.deleteColor': { en: 'Delete — reassign to nearest color', es: 'Borrar — reasignar al color más cercano' },
  'col.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'col.pickerLabel': { en: 'New color', es: 'Nuevo color' },

  // Shape editor
  'shape.title': { en: 'Refine Shapes', es: 'Perfeccionar formas' },
  'shape.nodesSub': { en: 'Click a shape to show its points, then drag them to fix the silhouette.', es: 'Haz clic en una forma para ver sus puntos, luego arrástralos para corregir la silueta.' },
  'shape.brushSub': { en: 'Paint directly on the image to fill gaps or touch up areas.', es: 'Pinta directamente sobre la imagen para rellenar huecos o retocar zonas.' },
  'shape.modeNodes': { en: '✥ Move nodes', es: '✥ Mover nodos' },
  'shape.modeBrush': { en: '🖌 Brush', es: '🖌 Pincel' },
  'shape.nodesHint': { en: 'Click a shape in the preview to edit its points.', es: 'Haz clic en una forma del preview para editar sus puntos.' },
  'shape.nodesActive': { en: 'Drag the blue points to reshape. Press Esc, click empty space, or Done when finished.', es: 'Arrastra los puntos azules para reformar. Pulsa Esc, haz clic en un espacio vacío o Listo al terminar.' },
  'shape.deselect': { en: 'Done editing nodes', es: 'Listo — salir de nodos' },
  'shape.nodes.help': { en: 'Each blue circle is a point of the selected shape. Drag to move it; the curve follows. Use undo if you overshoot.', es: 'Cada círculo azul es un punto de la forma seleccionada. Arrástralo para moverlo; la curva lo sigue. Usa deshacer si te pasas.' },
  'shape.nodesShort': { en: 'nodes', es: 'nodos' },
  'shape.nodesCount': { en: 'editable nodes in this shape', es: 'nodos editables en esta forma' },
  'shape.simplifySelected': { en: 'Simplify selected shape', es: 'Simplificar forma seleccionada' },
  'shape.simplifyStrength': { en: 'Simplify strength', es: 'Intensidad' },
  'shape.simplifyStrength.help': { en: 'Higher removes more nodes from the selected shape. Use the lowest value that leaves the silhouette looking right.', es: 'Más alto elimina más nodos de la forma seleccionada. Usa el valor más bajo que mantenga bien la silueta.' },
  'shape.compact': { en: 'Compact editable shapes', es: 'Compactar formas editables' },
  'shape.compactTarget': { en: 'Target shapes', es: 'Objetivo de formas' },
  'shape.compact.help': { en: 'Keeps the largest shapes separate and merges small same-color fragments into compound paths. It reduces the layer list without flattening the image.', es: 'Mantiene separadas las formas grandes y une fragmentos pequeños del mismo color en paths compuestos. Reduce la lista de capas sin aplanar la imagen.' },
  'shape.brushColor': { en: 'Color', es: 'Color' },
  'shape.brushSize': { en: 'Brush size', es: 'Tamaño del pincel' },
  'shape.brush.help': { en: 'Paints a vector stroke in the chosen color. Use it to fill a gap or cover an unwanted area. Pick a color matching the fill to blend in.', es: 'Pinta un trazo vectorial del color elegido. Úsalo para rellenar un hueco o tapar una zona no deseada. Elige un color igual al relleno para que se integre.' },
  'shape.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'shape.step': { en: 'Refine', es: 'Perfeccionar' },
  'shape.modeDelete': { en: '🗑 Erase', es: '🗑 Borrar' },
  'shape.deleteSub': { en: 'Drag on the canvas to erase local areas. Use the list below only when you want to delete a whole shape.', es: 'Arrastra sobre el lienzo para borrar zonas locales. Usa la lista de abajo solo cuando quieras borrar una forma completa.' },
  'shape.eraseBrushSub': { en: 'Drag on the canvas to erase local areas with a vector mask.', es: 'Arrastra sobre el lienzo para borrar zonas locales con una máscara vectorial.' },
  'shape.erasePathSub': { en: 'Click a colored area to delete its whole path and fill.', es: 'Haz clic en un área de color para borrar su path completo y su relleno.' },
  'shape.eraseBrush.help': { en: 'Eraser width in SVG units. It removes only the area you draw over, even inside a large path.', es: 'Ancho del borrador en unidades SVG. Elimina solo el área por donde dibujas, incluso dentro de un path grande.' },
  'shape.shapes': { en: 'Shapes', es: 'Formas' },
  'shape.shape': { en: 'Shape', es: 'Forma' },
  'shape.noShapes': { en: 'No shapes.', es: 'Sin formas.' },
  'shape.deleteShape': { en: 'Delete shape', es: 'Borrar forma' },
  'shape.list.help': { en: 'Every shape in the SVG. Hover a row to highlight it in the preview; click the trash to delete it. Great for removing stray bits.', es: 'Cada forma del SVG. Pasa el cursor por una fila para resaltarla en el preview; pulsa la papelera para borrarla. Ideal para quitar trozos sueltos.' },
  'shape.previewBg': { en: 'Preview background', es: 'Fondo del preview' },
  'shape.bgCheckerboard': { en: 'Checkerboard', es: 'Cuadrícula' },
  'shape.bgSolid': { en: 'Solid', es: 'Sólido' },

  // Workspace tools
  'tool.group.file': { en: 'File', es: 'Archivo' },
  'tool.group.edit': { en: 'Color', es: 'Color' },
  'tool.group.shape': { en: 'Refine', es: 'Refinar' },
  'tool.group.output': { en: 'Output', es: 'Salida' },
  'tool.group.view': { en: 'View', es: 'Vista' },
  'tool.import': { en: 'Import image', es: 'Importar imagen' },
  'tool.vectorize': { en: 'Vectorize', es: 'Vectorizar' },
  'tool.eyedropper': { en: 'Eyedropper', es: 'Cuentagotas' },
  'tool.fill': { en: 'Fill', es: 'Rellenar' },
  'tool.erase': { en: 'Erase', es: 'Borrar' },
  'tool.erasePath': { en: 'Erase shape', es: 'Borrar forma' },
  'tool.brush': { en: 'Brush', es: 'Pincel' },
  'tool.nodes': { en: 'Nodes', es: 'Nodos' },
  'tool.labels': { en: 'Labels', es: 'Etiquetas' },
  'tool.optimize': { en: 'Optimize', es: 'Optimizar' },
  'tool.zoom': { en: 'Zoom', es: 'Zoom' },

  // Optimize inspector sections
  'optimize.paletteSection': { en: 'Palette', es: 'Paleta' },
  'optimize.optimizeSection': { en: 'Optimization', es: 'Optimización' },

  // Workspace chrome
  'workspace.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'workspace.undo': { en: 'Undo', es: 'Deshacer' },
  'workspace.redo': { en: 'Redo', es: 'Rehacer' },
  'workspace.paths': { en: 'paths', es: 'formas' },
  'workspace.tools': { en: 'Tools', es: 'Herramientas' },
  'workspace.shortcutHint': { en: 'Press shortcut keys to switch tools', es: 'Usa atajos de teclado para cambiar herramientas' },
  'workspace.moreToolsAfterVectorize': {
    en: 'More edit tools appear after you vectorize.',
    es: 'Más herramientas de edición aparecen tras vectorizar.',
  },
  'workspace.replaceImage': { en: 'Replace image', es: 'Reemplazar imagen' },
  'workspace.importReplaceHint': {
    en: 'Drop a new image on the canvas, or clear the current one.',
    es: 'Suelta una imagen nueva en el lienzo o borra la actual.',
  },
  'workspace.canvas': { en: 'Editor canvas', es: 'Lienzo del editor' },
  'workspace.inspector': { en: 'Inspector panel', es: 'Panel inspector' },
  'workspace.openInspector': { en: 'Open inspector', es: 'Abrir inspector' },
  'workspace.closeInspector': { en: 'Close inspector', es: 'Cerrar inspector' },
  'workspace.canvasPlaceholder': { en: 'Canvas', es: 'Lienzo' },
  'workspace.inspectorPlaceholder': { en: 'Inspector', es: 'Inspector' },
  'workspace.labelsHint': { en: 'Click a shape in the canvas to name it. Labels are saved as data-label and CSS classes for web animation.', es: 'Haz clic en una forma del lienzo para nombrarla. Las etiquetas se guardan como data-label y clases CSS para animar en web.' },
  'workspace.fillHint': { en: 'Choose a fill color, then click one shape in the canvas to paint only that shape.', es: 'Elige un color de relleno y haz clic en una forma del lienzo para pintar solo esa forma.' },
  'workspace.fillCurrentColor': { en: 'Fill color', es: 'Color de relleno' },
  'workspace.fillSampledColor': { en: 'Sampled from canvas:', es: 'Recogido del lienzo:' },
  'workspace.fillPaintMode': { en: 'Paint', es: 'Pintar' },
  'workspace.fillSampleMode': { en: 'Pick', es: 'Tomar' },
  'workspace.fillAddToPalette': { en: 'Add to palette', es: 'Añadir a la paleta' },
  'workspace.fillSampleHint': { en: 'Click a shape in the canvas to pick its color. Fill will switch back to Paint after the sample.', es: 'Haz clic en una forma del lienzo para recoger su color. Fill volverá a Pintar después de muestrear.' },
  'workspace.statusColorPicked': { en: 'Color picked:', es: 'Color recogido:' },
  'workspace.statusFillReplaced': { en: 'Fill color replaced', es: 'Color de relleno reemplazado' },
  'workspace.statusFillPainted': { en: 'Shape fill painted', es: 'Relleno de la forma pintado' },
  'workspace.continueToColors': {
    en: 'Apply trace and edit colors',
    es: 'Aplicar trazado y editar colores',
  },
  'workflow.title': { en: 'Workflow', es: 'Flujo de trabajo' },
  'workflow.expand': { en: 'Expand', es: 'Expandir' },
  'workflow.collapse': { en: 'Collapse', es: 'Colapsar' },
  'workflow.compareOriginal': { en: 'Compare original', es: 'Comparar original' },
  'workflow.step1': {
    en: 'Import a PNG, JPG or WEBP image.',
    es: 'Importa una imagen PNG, JPG o WEBP.',
  },
  'workflow.step2': {
    en: 'Tune vectorization settings and preview the SVG.',
    es: 'Ajusta la vectorización y revisa el SVG.',
  },
  'workflow.step3': {
    en: 'Edit colors, then optimize for production.',
    es: 'Edita colores y optimiza para producción.',
  },
  'workflow.step4': {
    en: 'Download the finished SVG.',
    es: 'Descarga el SVG terminado.',
  },
} as const;

export type TKey = keyof typeof DICT;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  // Restore preference on mount.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from persisted user preference on mount
    if (saved === 'en' || saved === 'es') setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem('lang', l);
    } catch {
      // ignore storage errors
    }
  }, []);

  const t = useCallback((key: TKey) => DICT[key]?.[lang] ?? key, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
