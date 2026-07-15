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
  'app.tagline': { en: 'Vectorize on your device', es: 'Vectoriza en tu dispositivo' },
  'app.footer': { en: 'Your images never leave your device', es: 'Tus imágenes nunca salen de tu dispositivo' },
  'app.source': { en: 'Source on GitHub', es: 'Código en GitHub' },
  'app.source.hint': {
    en: 'SVG Tool lets you trace, refine, and download vector SVGs directly in your browser.',
    es: 'SVG Tool te permite trazar, refinar y descargar SVG vectoriales directamente en tu navegador.',
  },
  'lang.toggle': { en: 'EN', es: 'ES' },
  'lang.current': { en: 'English', es: 'Español' },
  'theme.switchToDark': { en: 'Switch to dark mode', es: 'Cambiar a modo oscuro' },
  'theme.switchToLight': { en: 'Switch to light mode', es: 'Cambiar a modo claro' },
  'theme.switchLang': { en: 'Switch language', es: 'Cambiar idioma' },
  'a11y.moreInfo': { en: 'More information', es: 'Más información' },
  'a11y.hexColor': { en: 'Hex color value', es: 'Valor de color hexadecimal' },
  'a11y.svgPreview': { en: 'SVG preview', es: 'Vista previa del SVG' },
  'a11y.pathLabel': { en: 'Shape label', es: 'Etiqueta de la forma' },

  // Errors
  'error.title': { en: 'Something went wrong', es: 'Algo salió mal' },
  'error.unknown': { en: 'Unknown error', es: 'Error desconocido' },
  'error.tryAgain': { en: 'Try again', es: 'Intentar de nuevo' },

  // Steps / wizard
  'nav.back': { en: '← Back', es: '← Atrás' },

  // Upload
  'upload.title': { en: 'Upload Image', es: 'Subir imagen' },
  'upload.subtitle': { en: 'Convert a raster image to a scalable SVG vector.', es: 'Convierte una imagen en un vector SVG escalable.' },
  'upload.drop': { en: 'Drag & drop an image here, or click to browse', es: 'Arrastra una imagen aquí, o haz clic para elegir' },
  'upload.formats': { en: 'PNG, JPG or WEBP · up to 10 MB', es: 'PNG, JPG o WEBP · hasta 10 MB' },
  'onboard.emptyTitle': {
    en: 'Drop an image to get a production-ready SVG',
    es: 'Suelta una imagen para obtener un SVG listo para producción',
  },
  'onboard.emptyBody': {
    en: 'Trace a flat icon or logo, then recolor, refine shapes, and download.',
    es: 'Traza un icono o logo plano; luego recolorea, refina formas y descarga.',
  },
  'onboard.trySample': {
    en: 'Try a sample icon',
    es: 'Probar un icono de ejemplo',
  },
  'onboard.vectorizeCue': {
    en: 'The SVG updates live as you adjust. Wait for the first preview, then prepare to download.',
    es: 'El SVG se actualiza al instante al ajustar. Espera la primera vista previa y luego prepáralo para descargar.',
  },
  'onboard.traceAction': {
    en: 'Tracing…',
    es: 'Trazando…',
  },
  'onboard.nextStepsLabel': {
    en: 'Next steps after vectorize',
    es: 'Siguientes pasos tras vectorizar',
  },
  'onboard.nextStepsTitle': {
    en: 'SVG ready — prepare to download',
    es: 'SVG listo — prepáralo para descargar',
  },
  'onboard.nextFill': {
    en: 'Edit colors first',
    es: 'Editar colores primero',
  },
  'onboard.nextOptimize': {
    en: 'Prepare for download',
    es: 'Preparar para descargar',
  },
  'onboard.nextStepsDismiss': {
    en: 'Dismiss next steps',
    es: 'Cerrar siguientes pasos',
  },
  'upload.error.INVALID_MIME': {
    en: 'Use PNG, JPG, or WEBP.',
    es: 'Usa PNG, JPG o WEBP.',
  },
  'upload.error.INVALID_MAGIC': {
    en: 'That file doesn’t look like a valid PNG, JPG, or WEBP.',
    es: 'Ese archivo no parece un PNG, JPG o WEBP válido.',
  },
  'upload.error.FILE_TOO_LARGE': {
    en: 'File is too large. Maximum size is 10 MB.',
    es: 'El archivo es demasiado grande. Máximo 10 MB.',
  },
  'upload.error.INVALID_DIMENSIONS': {
    en: 'Image is too large. Maximum size is 16384×16384 pixels.',
    es: 'La imagen es demasiado grande. Máximo 16384×16384 píxeles.',
  },
  'upload.error.LOAD_FAILED': {
    en: 'Couldn’t load that image. Try another file.',
    es: 'No se pudo cargar esa imagen. Prueba con otro archivo.',
  },
  'upload.error.READ_FAILED': {
    en: 'Couldn’t read that file. Try again.',
    es: 'No se pudo leer ese archivo. Inténtalo de nuevo.',
  },
  'upload.error.NO_CONTEXT': {
    en: 'Browser couldn’t process the image. Try another file.',
    es: 'El navegador no pudo procesar la imagen. Prueba con otro archivo.',
  },
  'upload.error.UNKNOWN': {
    en: 'Upload failed. Try another image.',
    es: 'La subida falló. Prueba con otra imagen.',
  },
  'upload.busy': { en: 'Loading image…', es: 'Cargando imagen…' },

  // Vectorize
  'vec.title': { en: 'Vectorize', es: 'Vectorizar' },
  'vec.subtitle': { en: 'Adjust until the SVG looks right.', es: 'Ajusta hasta que el SVG se vea bien.' },
  'vec.original': { en: 'Original', es: 'Original' },
  'vec.originalPick': { en: 'Original — click the background to remove it', es: 'Original — haz clic en el fondo para quitarlo' },
  'vec.showOriginal': { en: 'Show original', es: 'Ver original' },
  'vec.hideOriginal': { en: 'Hide original', es: 'Ocultar original' },
  'vec.vector': { en: 'Vector SVG', es: 'SVG vectorial' },
  'vec.notTracedYet': { en: 'Waiting for first SVG…', es: 'Esperando el primer SVG…' },
  'vec.palette': { en: 'Palette', es: 'Paleta' },
  'vec.colors': { en: 'colors', es: 'colores' },
  'vec.color': { en: 'color', es: 'color' },
  'vec.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'vec.continue': { en: 'Continue to colors →', es: 'Continuar a colores →' },
  'vec.revectorize': { en: 'Trace again', es: 'Trazar de nuevo' },
  'vec.auto': { en: 'Updates live as you adjust.', es: 'Se actualiza al instante al ajustar.' },
  'vec.vectorizing': { en: 'Creating your SVG…', es: 'Creando tu SVG…' },
  'workspace.working': { en: 'Updating…', es: 'Actualizando…' },
  'vec.optimized': { en: 'optimized', es: 'optimizado' },
  'vec.paletteEditor': { en: 'Clean icon palette', es: 'Paleta del icono limpio' },
  'vec.paletteEditor.help': { en: 'These colors come from your image. Edit, delete, or merge them before tracing.', es: 'Estos colores salen de tu imagen. Edítalos, bórralos o une parecidos antes de trazar.' },
  'vec.paletteMerge': { en: 'Merge similar', es: 'Unir parecidos' },
  'vec.paletteReset': { en: 'Reset suggestion', es: 'Restaurar sugerencia' },
  'vec.maxOptimize': { en: 'Optimize to the max', es: 'Optimizar al máximo' },
  'vec.maxOptimize.help': {
    en: 'Extra compression: turns smooth curves into straight segments. Smaller file, chunkier corners. Skip it if you want the sharpest look.',
    es: 'Compresión extra: convierte curvas suaves en segmentos rectos. Archivo más ligero, esquinas más toscas. Omítelo si quieres el aspecto más nítido.',
  },
  'vec.maxOptimize.confirm': {
    en: 'This flattens curves and can’t be undone except with Undo. Continue?',
    es: 'Esto aplana curvas y solo se puede revertir con Deshacer. ¿Continuar?',
  },
  'vec.maxOptimize.confirmAction': { en: 'Yes, optimize', es: 'Sí, optimizar' },
  'vec.maxOptimize.cancel': { en: 'Keep current', es: 'Conservar actual' },
  'vec.cleanFragments': { en: 'Clean fragments', es: 'Limpiar fragmentos' },
  'vec.cleanFragments.help': { en: 'Removes tiny near-white speckles and other stray bits at the edges — fixes background halos without changing the main shapes.', es: 'Elimina motas casi blancas y trozos sueltos en los bordes — corrige el halo del fondo sin alterar las formas principales.' },
  'zoom.panHint': {
    en: 'Space, Alt, or middle-mouse to pan',
    es: 'Espacio, Alt o botón central para mover',
  },
  'zoom.in': { en: 'Zoom in', es: 'Acercar' },
  'zoom.out': { en: 'Zoom out', es: 'Alejar' },
  'zoom.reset': { en: 'Reset zoom', es: 'Restablecer zoom' },
  'set.smoothing.help': { en: 'Higher simplifies and straightens edges (lighter file, chunkier corners); lower keeps curves faithful and sharper.', es: 'Más alto simplifica y endereza bordes (archivo más ligero, esquinas más toscas); más bajo mantiene curvas fieles y más nítidas.' },
  'set.detail.help': { en: 'Higher simplifies curves (lighter file, more angular); lower preserves smooth rounded detail.', es: 'Más alto simplifica curvas (archivo más ligero, más angular); más bajo conserva detalle redondeado y suave.' },
  'vec.complexWarn': { en: 'This image produced many shapes. Try fewer colors, more noise removal, or Optimize to the max to keep the file light.', es: 'Esta imagen generó muchas formas. Prueba menos colores, más “Quitar ruido” u “Optimizar al máximo” para aligerar el archivo.' },

  // Settings groups
  'set.basic': { en: 'Basic', es: 'Básico' },
  'set.adjustQuality': { en: 'Adjust quality', es: 'Ajustar calidad' },
  'set.adjustQuality.summary': {
    en: '{colors} colors · smooth {blur}',
    es: '{colors} colores · suavizado {blur}',
  },
  'set.advanced': { en: 'More settings', es: 'Más ajustes' },
  // Settings controls
  'set.traceMode': { en: 'Mode', es: 'Modo' },
  'set.traceMode.help': { en: 'Standard keeps your current settings. Icon flattens the image to a clean palette first — better for logos and UI icons.', es: 'Estándar mantiene tus ajustes actuales. Icono aplana la imagen a una paleta limpia primero — mejor para logos e iconos de UI.' },
  'set.traceMode.standard': { en: 'Standard', es: 'Estándar' },
  'set.traceMode.icon': { en: 'Icon', es: 'Icono' },
  'set.traceMode.icon.help': { en: 'Best for flat logos, icons, and simple UI art. Cleans soft edge noise before tracing so you get fewer stray shapes.', es: 'Ideal para logos planos, iconos e ilustraciones simples de UI. Limpia el ruido de bordes suaves antes de trazar para que salgan menos formas sueltas.' },
  'set.colors': { en: 'Colors', es: 'Colores' },
  'set.colors.levels': { en: '4 · 8 · 16 · 32 · 64 · 128', es: '4 · 8 · 16 · 32 · 64 · 128' },
  'set.colors.hint': { en: 'Default: 16 colors', es: 'Predeterminado: 16 colores' },
  'set.colors.help': { en: 'How many colors the SVG can use. Start low for a cleaner file; raise it only if important colors disappear.', es: 'Cuántos colores puede usar el SVG. Empieza bajo para un archivo más limpio; súbelo solo si desaparecen colores importantes.' },
  'set.icon.hint': { en: 'Best for icon assets: keeps accent colors and reduces noisy shapes. Use Remove background only when you need it.', es: 'Ideal para iconos: conserva acentos de color y reduce formas ruidosas. Usa Quitar fondo solo cuando lo necesites.' },
  'set.quantCycles': { en: 'Palette cycles', es: 'Ciclos de paleta' },
  'set.quantCycles.help': { en: 'How hard the suggested palette matches the source image. Higher is more faithful, but slower.', es: 'Qué tanto la paleta sugerida se acerca a la imagen original. Más alto es más fiel, pero más lento.' },
  'set.colorPrecision': { en: 'Colors', es: 'Colores' },
  'set.colorPrecision.help': { en: 'How many colors the SVG can use. Start low for a cleaner file; raise it only if important colors disappear.', es: 'Cuántos colores puede usar el SVG. Empieza bajo para un archivo más limpio; súbelo solo si desaparecen colores importantes.' },
  'set.smoothing': { en: 'Smoothing', es: 'Suavizado' },
  'set.detail': { en: 'Detail', es: 'Detalle' },
  'set.stroke': { en: 'Stroke width', es: 'Grosor de borde' },
  'set.stroke.help': { en: 'Older setting from a previous tracer. Current stacked layers usually seal shapes without same-color strokes.', es: 'Ajuste antiguo de un trazador anterior. Las capas actuales suelen sellar las formas sin bordes del mismo color.' },
  'set.noise': { en: 'Noise removal', es: 'Quitar ruido' },
  'set.noise.hint': { en: 'Low or medium keeps more detail. File size is compressed automatically.', es: 'Bajo o medio conserva más detalle. El tamaño del archivo se comprime solo.' },
  'set.noise.help': { en: 'Removes tiny speckles. Try 6–8 if shards remain; too high can erase useful details.', es: 'Quita motas diminutas. Prueba 6–8 si quedan astillas; demasiado alto puede borrar detalles útiles.' },
  'set.lineNoise': { en: 'Outline noise', es: 'Ruido de contorno' },
  'set.lineNoise.help': { en: 'Removes speckles on dark outline layers only. Keep it low so short line segments stay intact.', es: 'Quita motas solo en capas oscuras de contorno. Mantenlo bajo para no borrar segmentos cortos.' },
  'set.traceScale': { en: 'Trace scale', es: 'Escala de trazado' },
  'set.traceScale.help': { en: 'Upscales the image before tracing. 2× can smooth line art, but takes longer.', es: 'Amplía la imagen antes de trazar. 2× puede suavizar el trazado lineal, pero tarda más.' },
  'set.blurDelta': { en: 'Blur delta', es: 'Delta de desenfoque' },
  'set.blurDelta.help': { en: 'How strongly soft edges count as edges. Lower follows subtle edges; higher ignores weak transitions.', es: 'Qué tan fuerte cuentan los bordes suaves. Más bajo sigue bordes sutiles; más alto ignora transiciones débiles.' },
  'set.precision': { en: 'Precision', es: 'Precisión' },
  'set.precision.hint': { en: 'Lower = fewer decimals → smaller file.', es: 'Más bajo = menos decimales → archivo más ligero.' },
  'set.precision.help': {
    en: 'How many decimals to keep in shape coordinates. Lower = smaller file with a slight loss of precision.',
    es: 'Cuántos decimales guardar en las coordenadas. Más bajo = archivo más ligero con una ligera pérdida de precisión.',
  },
  'set.cornerThreshold': { en: 'Corners', es: 'Esquinas' },
  'set.cornerThreshold.help': { en: 'How sharp an angle must be to count as a corner. Higher = fewer false corners and smoother outlines.', es: 'Qué tan agudo debe ser un ángulo para contar como esquina. Más alto = menos esquinas falsas y contornos más suaves.' },
  'set.bilateralSigma': { en: 'Edge preserve', es: 'Preservar bordes' },
  'set.bilateralSigma.help': { en: 'How much to protect hard edges while smoothing. Lower keeps edges crisp; higher smooths more noise.', es: 'Cuánto proteger los bordes duros al suavizar. Más bajo deja bordes nítidos; más alto suaviza más ruido.' },
  'set.alphaThreshold': { en: 'Edge cleanup', es: 'Limpieza de borde' },
  'set.alphaThreshold.help': { en: 'Removes soft transparent fringe before tracing. Raise it if pale dots appear around edges; lower it if edges look clipped.', es: 'Quita el borde semitransparente antes de trazar. Súbelo si aparecen puntos claros alrededor; bájalo si el borde se recorta.' },
  'set.paletteMerge': { en: 'Merge shades', es: 'Unir tonos' },
  'set.paletteMerge.help': { en: 'Combines very similar colors before the palette limit. Higher = fewer colors and a smaller file, but shading can flatten.', es: 'Une colores muy parecidos antes del límite de paleta. Más alto = menos colores y archivo más ligero, pero el sombreado puede aplanarse.' },
  'set.layerDifference': { en: 'Layer difference', es: 'Diferencia de capa' },
  'set.layerDifference.help': { en: 'How different stacked color layers must be. Higher reduces soft gradient bands and file size.', es: 'Qué tan distintas deben ser las capas de color apiladas. Más alto reduce bandas de degradado y el peso del archivo.' },
  'set.lengthThreshold': { en: 'Segment length', es: 'Longitud de segmento' },
  'set.lengthThreshold.help': { en: 'How finely curves are subdivided. Lower follows detail more closely; higher simplifies shapes.', es: 'Qué tan fino se subdividen las curvas. Más bajo sigue más detalle; más alto simplifica las formas.' },
  'set.maxIterations': { en: 'Curve passes', es: 'Pasadas de curva' },
  'set.maxIterations.help': { en: 'How many smoothing passes run when fitting curves. Higher can look smoother, but costs more time.', es: 'Cuántas pasadas de suavizado se usan al ajustar curvas. Más alto puede verse más suave, pero tarda más.' },
  'set.spliceThreshold': { en: 'Curve joins', es: 'Empalmes de curva' },
  'set.spliceThreshold.help': { en: 'When nearby curve pieces join into one. Higher simplifies curves more aggressively.', es: 'Cuándo se unen trozos de curva cercanos. Más alto simplifica las curvas con más fuerza.' },
  'set.fillOverlap': { en: 'Fill overlap', es: 'Solape de relleno' },
  'set.fillOverlap.help': { en: 'Expands fills under outlines before tracing. Higher seals gaps; too high can thicken small details.', es: 'Expande los rellenos debajo del contorno antes de trazar. Más alto sella huecos; demasiado puede engordar detalles pequeños.' },
  'set.lineSmoothing': { en: 'Line cleanup', es: 'Limpieza de línea' },
  'set.lineSmoothing.help': { en: 'Removes isolated dark bits from outline masks before tracing. Higher fixes broken edges; too high can erase fine lines.', es: 'Quita trozos oscuros aislados de las máscaras de contorno antes de trazar. Más alto arregla bordes rotos; demasiado puede borrar líneas finas.' },
  'set.curveSmoothing': { en: 'Curve smoothing', es: 'Suavizado de curvas' },
  'set.curveSmoothing.help': { en: 'Turns jagged outlines into smooth curves after tracing. 0 keeps polygons; 1 is balanced; 2 is smoother.', es: 'Convierte contornos dentados en curvas suaves después de trazar. 0 conserva polígonos; 1 es equilibrado; 2 es más suave.' },

  // Blur
  'set.blur': { en: 'Smooth noise', es: 'Suavizar ruido' },
  'set.blur.hint': { en: '0 = off · 1 = default · 2–3 smooths noisy photos more.', es: '0 = apagado · 1 = predeterminado · 2–3 suaviza más las fotos ruidosas.' },
  'set.blur.help': { en: 'Softens noise before tracing while trying to keep hard edges. Raise it for grainy photos; leave it low for sharp icons.', es: 'Suaviza el ruido antes de trazar y procura mantener los bordes duros. Súbelo en fotos granuladas; déjalo bajo en iconos nítidos.' },

  // Background removal
  'bg.remove': { en: 'Remove background', es: 'Quitar fondo' },
  'bg.auto.help': { en: 'Click the image background to pick a specific color instead of using auto mode.', es: 'Haz clic en el fondo de la imagen para elegir un color específico en vez del modo automático.' },
  'bg.picking': { en: 'Removing the color you clicked. Both views update automatically. Click again to remove other background areas.', es: 'Quitando el color que tocaste. Ambas vistas se actualizan solas. Haz más clics para quitar otras zonas del fondo.' },
  'bg.contiguous': { en: 'Connected area only', es: 'Solo zona conectada' },
  'bg.contiguous.help': {
    en: 'On: removes only the area connected to your click. Off: removes that color everywhere in the image.',
    es: 'Activado: quita solo el área conectada a tu clic. Desactivado: quita ese color en toda la imagen.',
  },
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
  'col.eraseSub': { en: 'Erase mode: click any shape in the view to delete it.', es: 'Modo borrar: haz clic en cualquier forma de la vista para eliminarla.' },
  'col.undo': { en: 'Undo', es: 'Deshacer' },
  'col.redo': { en: 'Redo', es: 'Rehacer' },
  'col.erase': { en: 'Erase path mode', es: 'Modo borrar forma' },
  'col.erase.help': { en: 'When on, clicking a shape deletes it. Turn off to go back to editing colors.', es: 'Cuando está activo, al hacer clic en una forma se elimina. Desactívalo para volver a editar colores.' },
  'col.merge': { en: 'Merge similar colors', es: 'Unir colores parecidos' },
  'col.merge.help': { en: 'Combines shades that are close in color into one. Raise the value for a more logo-like palette; lower it to preserve distinct colors.', es: 'Combina tonos parecidos en uno. Sube el valor para una paleta más tipo logo; bájalo para conservar colores distintos.' },
  'col.mergeBtn': { en: 'Merge similar', es: 'Unir parecidos' },
  'col.reduce': { en: 'Reduce to colors', es: 'Reducir a colores' },
  'col.reduce.help': { en: 'Forces the palette down to exactly this many colors by merging the closest ones.', es: 'Fuerza la paleta a exactamente esta cantidad de colores uniendo los más cercanos.' },
  'col.reduceBtn': { en: 'Reduce to', es: 'Reducir a' },
  'col.normalize': { en: 'Normalize palette', es: 'Normalizar paleta' },
  'col.normalize.help': { en: 'Cleans up the palette in one click: groups all the near-duplicate shades (e.g. a dozen beiges) into a few clean, distinct colors. Best starting point before fine-tuning.', es: 'Limpia la paleta de un clic: agrupa todos los tonos casi iguales (p. ej. una docena de beiges) en unos pocos colores limpios y distintos. El mejor punto de partida antes de afinar.' },
  'col.snapBlack': { en: 'Dark → black threshold', es: 'Umbral oscuros → negro' },
  'col.snapBlack.help': { en: 'Converts every dark color below this brightness to pure #000. Collapses the many near-black shades into one clean black. Higher = catches lighter darks too.', es: 'Convierte a #000 puro todo color oscuro por debajo de este brillo. Une los muchos tonos casi negros en un solo negro limpio. Más alto = también captura oscuros más claros.' },
  'col.snapBlackBtn': { en: 'Snap darks to #000', es: 'Unir oscuros a #000' },
  'col.autoSimplify': { en: 'Auto-simplify (keep vivid colors)', es: 'Simplificar automático (conservar colores vivos)' },
  'col.autoSimplify.help': { en: 'Collapses dull near-duplicate tones (like many near-blacks) first, keeping primary and secondary colors. Reduces to the count set below.', es: 'Une primero los tonos apagados casi iguales (como muchos negros parecidos), conservando los colores primarios y secundarios. Reduce a la cantidad indicada abajo.' },
  'col.holdOriginal': { en: 'Hold to see original', es: 'Mantén pulsado para ver el original' },
  'col.showingOriginal': { en: 'Showing original', es: 'Mostrando original' },
  'col.showingEdited': { en: 'Showing edited', es: 'Mostrando editado' },
  'col.originalColors': { en: 'Original colors', es: 'Colores originales' },
  'col.originalColors.help': { en: 'The colors the image had when you entered this step. Click one to reapply it.', es: 'Los colores que tenía la imagen al entrar a este paso. Haz clic en uno para reaplicarlo.' },
  'col.paletteTitle': { en: 'Palette', es: 'Paleta' },
  'col.noColors': { en: 'No colors found.', es: 'No se encontraron colores.' },
  'col.selectColor': { en: 'Select color', es: 'Seleccionar color' },
  'col.deleteColor': { en: 'Delete — reassign to nearest color', es: 'Borrar — reasignar al color más cercano' },
  'col.deleteColor.confirm': { en: 'Delete', es: 'Borrar' },
  'col.deleteColor.cancel': { en: 'Keep color', es: 'Conservar color' },
  'col.deleteColor.prompt': {
    en: 'Delete this color? Shapes using it move to the nearest color.',
    es: '¿Borrar este color? Las formas que lo usan pasan al color más cercano.',
  },
  'vec.paletteReset.confirm': {
    en: 'Reset the suggested palette? Your palette edits will be lost.',
    es: '¿Restaurar la paleta sugerida? Se perderán tus ediciones.',
  },
  'vec.paletteReset.confirmAction': { en: 'Yes, reset', es: 'Sí, restaurar' },
  'vec.paletteReset.cancel': { en: 'Keep palette', es: 'Conservar paleta' },
  'col.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'col.pickerLabel': { en: 'New color', es: 'Nuevo color' },
  'col.invalidHex': {
    en: 'Enter a hex color like #ff0000.',
    es: 'Introduce un color hex como #ff0000.',
  },
  'labels.title': { en: 'Label this shape', es: 'Etiqueta esta forma' },
  'labels.editingHint': {
    en: 'The blue outline shows the shape you are naming.',
    es: 'El contorno azul muestra la forma que estás nombrando.',
  },
  'labels.placeholder': { en: 'e.g. wing, beak, body', es: 'p. ej. ala, pico, cuerpo' },
  'labels.save': { en: 'Save label', es: 'Guardar etiqueta' },
  'labels.cancel': { en: 'Keep editing', es: 'Seguir editando' },
  'labels.exportedAs': { en: 'Exports as', es: 'Se exporta como' },
  'labels.exportHelp': {
    en: 'Each label writes data-label, a CSS class, and a matching SVG <g> wrapper for animation.',
    es: 'Cada etiqueta escribe data-label, una clase CSS y un contenedor SVG <g> para animación.',
  },
  'labels.listTitle': { en: 'Named parts', es: 'Partes nombradas' },
  'labels.empty': {
    en: 'Click a shape in the canvas to name it for CSS or animation.',
    es: 'Haz clic en una forma del lienzo para nombrarla y usarla en CSS o animaciones.',
  },
  'labels.editingCanvas': { en: 'Editing label', es: 'Editando etiqueta' },
  'labels.newLabelTarget': { en: 'New labeled part', es: 'Nueva parte etiquetada' },
  'vec.previewPlaceholder': {
    en: 'Preview will appear here after vectorization',
    es: 'La vista previa aparecerá aquí tras vectorizar',
  },
  'vec.renderError': {
    en: 'Could not render SVG: {message}',
    es: 'No se pudo mostrar el SVG: {message}',
  },

  // Shape editor
  'shape.title': { en: 'Refine shapes', es: 'Refinar formas' },
  'shape.nodesSub': { en: 'Click a shape to show its points, then drag them to fix the silhouette.', es: 'Haz clic en una forma para ver sus puntos, luego arrástralos para corregir la silueta.' },
  'shape.brushSub': { en: 'Paint directly on the image to fill gaps or touch up areas.', es: 'Pinta directamente sobre la imagen para rellenar huecos o retocar zonas.' },
  'shape.modeNodes': { en: 'Move points', es: 'Mover puntos' },
  'shape.modeBrush': { en: 'Brush', es: 'Pincel' },
  'shape.nodesHint': { en: 'Click a shape to edit its points.', es: 'Haz clic en una forma para editar sus puntos.' },
  'shape.nodesActive': {
    en: 'Drag the blue points to reshape. Press Esc, click empty space, or Done when finished.',
    es: 'Arrastra los puntos azules para reformar. Pulsa Esc, haz clic en un espacio vacío o Listo al terminar.',
  },
  'shape.deselect': { en: 'Done', es: 'Listo' },
  'shape.nodes.help': {
    en: 'Each blue circle is a point on the selected shape. Drag to move it; the curve follows. Use undo if you overshoot.',
    es: 'Cada círculo azul es un punto de la forma seleccionada. Arrástralo para moverlo; la curva lo sigue. Usa deshacer si te pasas.',
  },
  'shape.nodesShort': { en: 'points', es: 'puntos' },
  'shape.nodesCount': { en: 'editable points in this shape', es: 'puntos editables en esta forma' },
  'shape.simplifySelected': { en: 'Simplify selected shape', es: 'Simplificar forma seleccionada' },
  'shape.simplifyStrength': { en: 'Simplify strength', es: 'Intensidad' },
  'shape.simplifyStrength.help': {
    en: 'Higher removes more points from the selected shape. Use the lowest value that leaves the silhouette looking right.',
    es: 'Más alto elimina más puntos de la forma seleccionada. Usa el valor más bajo que mantenga bien la silueta.',
  },
  'shape.compact': { en: 'Compact editable shapes', es: 'Compactar formas editables' },
  'shape.compactTarget': { en: 'Target shapes', es: 'Objetivo de formas' },
  'shape.compact.help': {
    en: 'Keeps large shapes separate and merges tiny same-color scraps. Shorter shape list, same overall look.',
    es: 'Mantiene las formas grandes separadas y une restos diminutos del mismo color. Lista más corta, mismo aspecto.',
  },
  'shape.brushColor': { en: 'Color', es: 'Color' },
  'shape.brushSize': { en: 'Brush size', es: 'Tamaño del pincel' },
  'shape.brush.help': {
    en: 'Paints a vector stroke in the chosen color. Use it to fill a gap or cover an unwanted area. Match the nearby fill to blend in.',
    es: 'Pinta un trazo vectorial del color elegido. Úsalo para rellenar un hueco o tapar una zona. Elige un color igual al relleno cercano para que se integre.',
  },
  'shape.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'shape.step': { en: 'Refine', es: 'Perfeccionar' },
  'shape.modeDelete': { en: 'Erase', es: 'Borrar' },
  'shape.deleteSub': {
    en: 'Drag on the canvas to erase local areas. Use the list below only when you want to delete a whole shape.',
    es: 'Arrastra sobre el lienzo para borrar zonas locales. Usa la lista de abajo solo cuando quieras borrar una forma completa.',
  },
  'shape.eraseBrushSub': {
    en: 'Drag on the canvas to erase local areas.',
    es: 'Arrastra sobre el lienzo para borrar zonas locales.',
  },
  'shape.erasePathSub': {
    en: 'Click a colored area to delete that whole shape.',
    es: 'Haz clic en un área de color para borrar esa forma completa.',
  },
  'shape.eraseBrush.help': {
    en: 'Eraser width. It removes only the area you draw over, even inside a large shape.',
    es: 'Ancho del borrador. Elimina solo el área por donde dibujas, incluso dentro de una forma grande.',
  },
  'shape.shapes': { en: 'Shapes', es: 'Formas' },
  'shape.shape': { en: 'Shape', es: 'Forma' },
  'shape.noShapes': { en: 'No shapes.', es: 'Sin formas.' },
  'shape.deleteShape': { en: 'Delete shape', es: 'Borrar forma' },
  'shape.deleteShape.confirm': { en: 'Delete', es: 'Borrar' },
  'shape.deleteShape.cancel': { en: 'Keep shape', es: 'Conservar forma' },
  'shape.list.help': { en: 'Every shape in the SVG. Hover a row to highlight it; click the trash to delete it. Useful for removing stray bits.', es: 'Cada forma del SVG. Pasa el cursor por una fila para resaltarla; pulsa la papelera para borrarla. Útil para quitar trozos sueltos.' },
  'shape.previewBg': { en: 'View background', es: 'Fondo de la vista' },
  'shape.bgCheckerboard': { en: 'Checkerboard', es: 'Cuadrícula' },
  'shape.bgSolid': { en: 'Solid', es: 'Sólido' },

  // Workspace tools
  'tool.group.file': { en: 'File', es: 'Archivo' },
  'tool.group.edit': { en: 'Color', es: 'Color' },
  'tool.group.shape': { en: 'Refine shapes', es: 'Refinar formas' },
  'tool.group.output': { en: 'Output', es: 'Salida' },
  'tool.group.view': { en: 'View', es: 'Vista' },
  'tool.import': { en: 'Import', es: 'Importar' },
  'tool.vectorize': { en: 'Vectorize', es: 'Vectorizar' },
  'tool.eyedropper': { en: 'Eyedropper', es: 'Cuentagotas' },
  'tool.fill': { en: 'Fill', es: 'Rellenar' },
  'tool.erase': { en: 'Erase', es: 'Borrar' },
  'tool.erasePath': { en: 'Delete shape', es: 'Eliminar forma' },
  'tool.brush': { en: 'Brush', es: 'Pincel' },
  'tool.nodes': { en: 'Points', es: 'Puntos' },
  'tool.labels': { en: 'Labels', es: 'Etiquetas' },
  'tool.optimize': { en: 'Optimize', es: 'Optimizar' },
  'tool.zoom': { en: 'Zoom', es: 'Zoom' },
  'tool.import.hint': {
    en: 'Replace the image when you need a fresh start.',
    es: 'Reemplaza la imagen cuando quieras empezar de nuevo.',
  },
  'tool.vectorize.hint': {
    en: 'Adjust until the SVG looks right, then choose Fill colors or Optimize for download.',
    es: 'Ajusta hasta que el SVG se vea bien; luego elige Rellenar colores u Optimizar para descargar.',
  },
  'tool.fill.hint': {
    en: 'Pick a color, then click a shape to paint it. Use Pick (I) under Fill to sample from the canvas.',
    es: 'Elige un color y haz clic en una forma para pintarla. Usa Tomar (I) bajo Rellenar para muestrear del lienzo.',
  },
  'tool.eyedropper.hint': {
    en: 'Click a shape to sample its color, then paint with Fill.',
    es: 'Haz clic en una forma para tomar su color; luego pinta con Rellenar.',
  },
  'tool.erase.hint': {
    en: 'Drag across a shape to erase parts of it.',
    es: 'Arrastra sobre una forma para borrar partes.',
  },
  'tool.erasePath.hint': {
    en: 'Click a shape to delete it entirely.',
    es: 'Haz clic en una forma para eliminarla por completo.',
  },
  'tool.brush.hint': {
    en: 'Paint new filled shapes on the canvas.',
    es: 'Pinta formas rellenas nuevas en el lienzo.',
  },
  'tool.nodes.hint': {
    en: 'Select a shape, then drag its points to reshape it.',
    es: 'Selecciona una forma y arrastra sus puntos para cambiarla.',
  },
  'tool.labels.hint': {
    en: 'Click a shape to name it for CSS and animation.',
    es: 'Haz clic en una forma para nombrarla (CSS y animación).',
  },
  'tool.optimize.hint': {
    en: 'Prepare for download first, then use Download SVG in the top bar.',
    es: 'Primero prepara para descargar; luego usa Descargar SVG en la barra superior.',
  },

  // Optimize inspector sections
  'optimize.paletteSection': { en: 'Palette', es: 'Paleta' },
  'optimize.optimizeSection': { en: 'File size', es: 'Tamaño de archivo' },
  'optimize.subtitle': {
    en: 'Prepare once for a smaller, production-ready SVG.',
    es: 'Prepara una vez un SVG más liviano y listo para producción.',
  },
  'optimize.prepare': {
    en: 'Prepare for download',
    es: 'Preparar para descargar',
  },
  'optimize.prepare.help': {
    en: 'Cleans the palette and compacts shapes so the download is smaller and ready to ship.',
    es: 'Limpia la paleta y compacta formas para que la descarga sea más liviana y lista para usar.',
  },
  'optimize.prepare.targets': {
    en: '{colors} colors · ~{shapes} shapes',
    es: '{colors} colores · ~{shapes} formas',
  },
  'optimize.prepare.preset.smaller': { en: 'Smaller', es: 'Más liviano' },
  'optimize.prepare.preset.balanced': { en: 'Balanced', es: 'Equilibrado' },
  'optimize.prepare.preset.detail': { en: 'Keep detail', es: 'Más detalle' },
  'optimize.preparedStatus': {
    en: 'Prepared. Undo if needed, then Download SVG in the top bar.',
    es: 'Preparado. Deshaz si hace falta y luego Descarga el SVG arriba.',
  },
  'optimize.morePalette': { en: 'More palette tools', es: 'Más herramientas de paleta' },
  'optimize.morePalette.summary': {
    en: 'Reduce, merge, snap to black',
    es: 'Reducir, fusionar, forzar negro',
  },
  'optimize.moreCompression': { en: 'More compression', es: 'Más compresión' },
  'optimize.moreCompression.summary': {
    en: 'Compact shapes, clean fragments, max compress',
    es: 'Compactar formas, limpiar fragmentos, comprimir al máximo',
  },
  'optimize.advanced': {
    en: 'Advanced',
    es: 'Avanzado',
  },
  'optimize.advanced.summary': {
    en: 'Palette, reduce colors, compact, clean fragments',
    es: 'Paleta, reducir colores, compactar, limpiar fragmentos',
  },

  // Workspace chrome
  'workspace.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'workspace.localOnly': { en: 'All local', es: 'Todo local' },
  'workspace.localOnlyHint': {
    en: 'Your image stays on this device',
    es: 'Tu imagen se queda en este dispositivo',
  },
  'workspace.readyToDownload': { en: 'Ready', es: 'Listo' },
  'workspace.downloadUnprepared': {
    en: 'Download without preparing',
    es: 'Descargar sin preparar',
  },
  'workspace.downloadPrepared': {
    en: 'Download SVG',
    es: 'Descargar SVG',
  },
  'workspace.downloadRaw': {
    en: 'Downloads the SVG as-is. For a smaller production file, use Prepare for download first.',
    es: 'Descarga el SVG tal cual. Para un archivo de producción más liviano, usa Preparar para descargar primero.',
  },
  'workspace.downloadNeedsPrepare': {
    en: 'Prepare for download in Optimize first. Raw download is available there if you need it.',
    es: 'Primero prepara para descargar en Optimizar. Ahí también puedes descargar sin preparar si lo necesitas.',
  },
  'workspace.downloadDisabled': {
    en: 'Download becomes available after you create an SVG.',
    es: 'La descarga estará disponible cuando tengas un SVG.',
  },
  'workspace.undo': { en: 'Undo', es: 'Deshacer' },
  'workspace.redo': { en: 'Redo', es: 'Rehacer' },
  'workspace.paths': { en: 'shapes', es: 'formas' },
  'workspace.tools': { en: 'Tools', es: 'Herramientas' },
  'workspace.shortcutHint': {
    en: 'Shortcuts: G Fill · A Points · E Erase — hover a tool for its key.',
    es: 'Atajos: G Rellenar · A Puntos · E Borrar — pasa el cursor por una herramienta.',
  },
  'workspace.moreToolsAfterVectorize': {
    en: 'When you’re happy with the trace, prepare for download or edit colors.',
    es: 'Cuando el trazo te convenza, prepáralo para descargar o edita colores.',
  },
  'workspace.replaceImage': { en: 'Replace image', es: 'Reemplazar imagen' },
  'workspace.replaceImage.confirm': {
    en: 'Clear this image and SVG? You can’t undo this.',
    es: '¿Borrar esta imagen y el SVG? No se puede deshacer.',
  },
  'workspace.replaceImage.confirmAction': { en: 'Replace image', es: 'Reemplazar imagen' },
  'workspace.replaceImage.cancel': { en: 'Keep current', es: 'Conservar actual' },
  'workspace.importReplaceHint': {
    en: 'Use Replace image below to start over with a new file. This clears the current image and SVG.',
    es: 'Usa Reemplazar imagen abajo para empezar con un archivo nuevo. Esto borra la imagen y el SVG actuales.',
  },
  'workspace.canvas': { en: 'Editor canvas', es: 'Lienzo del editor' },
  'workspace.inspector': { en: 'Inspector panel', es: 'Panel inspector' },
  'workspace.openInspector': { en: 'Open inspector', es: 'Abrir inspector' },
  'workspace.closeInspector': { en: 'Close inspector', es: 'Cerrar inspector' },
  'workspace.canvasPlaceholder': { en: 'Canvas', es: 'Lienzo' },
  'workspace.inspectorPlaceholder': { en: 'Inspector', es: 'Inspector' },
  'workspace.fillHint': {
    en: 'Pick a fill color, then click one shape to paint only that shape.',
    es: 'Elige un color de relleno y haz clic en una forma para pintar solo esa forma.',
  },
  'workspace.labelsHint': {
    en: 'Click a shape to name it. Names become data-label and CSS classes for animation.',
    es: 'Haz clic en una forma para nombrarla. Los nombres se guardan como data-label y clases CSS.',
  },
  'workspace.labelLegend': {
    en: 'Include label legend in download',
    es: 'Incluir leyenda de etiquetas en la descarga',
  },
  'workspace.labelLegendHint': {
    en: 'Adds a comment with the exported labels at the top of the SVG file.',
    es: 'Añade un comentario con las etiquetas exportadas al inicio del archivo SVG.',
  },
  'workspace.preparedReady': {
    en: 'Ready to export',
    es: 'Listo para exportar',
  },
  'workspace.preparedReadyHint': {
    en: 'Prepared snapshot matches the current export file.',
    es: 'El snapshot preparado coincide con el archivo actual de exportación.',
  },
  'workspace.preparedStale': {
    en: 'Edited after prepare',
    es: 'Editado después de preparar',
  },
  'workspace.preparedStaleHint': {
    en: 'Prepare again to export the latest changes.',
    es: 'Prepara otra vez para exportar los cambios más recientes.',
  },
  'workspace.fillCurrentColor': { en: 'Fill color', es: 'Color de relleno' },
  'workspace.fillSampledColor': { en: 'Sampled from canvas:', es: 'Recogido del lienzo:' },
  'workspace.fillPaintMode': { en: 'Paint', es: 'Pintar' },
  'workspace.fillSampleMode': { en: 'Pick', es: 'Tomar' },
  'workspace.fillAddToPalette': { en: 'Add to palette', es: 'Añadir a la paleta' },
  'workspace.fillSampleHint': { en: 'Click a shape in the canvas to pick its color. Paint mode turns back on after you sample.', es: 'Haz clic en una forma del lienzo para recoger su color. El modo Pintar se reactiva tras muestrear.' },
  'workspace.statusColorPicked': { en: 'Color picked:', es: 'Color recogido:' },
  'workspace.statusFillReplaced': { en: 'Fill color updated', es: 'Color de relleno actualizado' },
  'workspace.statusFillPainted': { en: 'Shape painted', es: 'Forma pintada' },
  'workspace.continueToColors': {
    en: 'Continue to Fill colors',
    es: 'Continuar a Rellenar colores',
  },
  'workflow.compareOriginal': { en: 'Compare original', es: 'Comparar original' },
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
