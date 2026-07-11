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
  'onboard.emptyTitle': {
    en: 'Drop an image to get a production-ready SVG',
    es: 'Suelta una imagen para obtener un SVG listo para producción',
  },
  'onboard.emptyBody': {
    en: 'Vectorize flat icons and logos in the browser — then recolor, refine, and download.',
    es: 'Vectoriza iconos y logos planos en el navegador — luego recolorea, afina y descarga.',
  },
  'onboard.trySample': {
    en: 'Try a sample icon',
    es: 'Probar un icono de ejemplo',
  },
  'onboard.inspectorTitle': {
    en: 'Start here',
    es: 'Empieza aquí',
  },
  'onboard.inspectorBody': {
    en: 'Drop an image on the canvas (or try the sample). You’ll vectorize next, then edit and download.',
    es: 'Suelta una imagen en el lienzo (o prueba el ejemplo). Luego vectorizas, editas y descargas.',
  },
  'onboard.firstSvgTip': {
    en: 'Next: Fill (G) or Optimize. Shape tools are under Refine.',
    es: 'Siguiente: Rellenar (G) u Optimizar. Las formas están en Refinar.',
  },
  'onboard.gotIt': { en: 'Got it', es: 'Entendido' },
  'onboard.dismissTip': { en: 'Dismiss tip', es: 'Cerrar consejo' },
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
  'vec.subtitle': { en: 'Adjust until the preview looks right.', es: 'Ajusta hasta que la vista previa se vea bien.' },
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
  'workspace.working': { en: 'Updating…', es: 'Actualizando…' },
  'vec.optimized': { en: 'optimized', es: 'optimizado' },
  'vec.paletteEditor': { en: 'Clean icon palette', es: 'Paleta del icono limpio' },
  'vec.palettePreviewHint': { en: "Colors we'll trace with — fine-tune later in Fill", es: 'Colores que trazaremos — afina luego en Fill' },
  'vec.readyHint': {
    en: 'Continue to edit colors, or download from the top bar.',
    es: 'Sigue a editar colores, o descarga desde la barra superior.',
  },
  'vec.paletteEditor.help': { en: 'These colors come from your image. Edit, delete, or merge them before tracing.', es: 'Estos colores salen de tu imagen. Edítalos, bórralos o une parecidos antes de trazar.' },
  'vec.paletteMerge': { en: 'Merge similar', es: 'Unir parecidos' },
  'vec.paletteReset': { en: 'Reset suggestion', es: 'Restaurar sugerencia' },
  'vec.refineColors': { en: 'Refine colors', es: 'Afinar colores' },
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
  'vec.maxOptimize.cancel': { en: 'Cancel', es: 'Cancelar' },
  'vec.cleanFragments': { en: 'Clean fragments', es: 'Limpiar fragmentos' },
  'vec.cleanFragments.help': { en: 'Removes tiny near-white speckles and other small stray paths at the edges — fixes background halos without changing the main shapes.', es: 'Elimina motas blancas diminutas y otros paths sueltos en los bordes — corrige halos del fondo sin alterar las formas principales.' },
  'zoom.panHint': {
    en: 'Space, Alt, or middle-mouse to pan',
    es: 'Espacio, Alt o botón central para mover',
  },
  'zoom.in': { en: 'Zoom in', es: 'Acercar' },
  'zoom.out': { en: 'Zoom out', es: 'Alejar' },
  'zoom.reset': { en: 'Reset zoom', es: 'Restablecer zoom' },
  'set.smoothing.help': { en: 'Higher simplifies and straightens edges (lighter file, chunkier corners); lower keeps curves faithful and sharper.', es: 'Más alto simplifica y endereza bordes (archivo más ligero, esquinas más toscas); más bajo mantiene curvas fieles y más nítidas.' },
  'set.detail.help': { en: 'Higher simplifies curves (lighter file, more angular); lower preserves smooth rounded detail.', es: 'Más alto simplifica curvas (archivo más ligero, más angular); más bajo conserva detalle redondeado y suave.' },
  'vec.complexWarn': { en: 'This icon produced many shapes. Try fewer colors, more noise removal, or “Optimize to the max” to keep the SVG lightweight.', es: 'Este icono generó muchas formas. Prueba menos colores, más “quitar ruido” u “Optimizar al máximo” para mantener el SVG liviano.' },

  // Settings groups
  'set.basic': { en: 'Basic', es: 'Básico' },
  'set.advanced': { en: 'More settings', es: 'Más ajustes' },
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
  'set.precision.help': {
    en: 'How many decimals to keep in shape coordinates. Lower = smaller file with a slight loss of precision.',
    es: 'Cuántos decimales guardar en las coordenadas. Más bajo = archivo más ligero con una ligera pérdida de precisión.',
  },
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
  'bg.on': { en: 'On', es: 'Activo' },
  'bg.off': { en: 'Off', es: 'Apagado' },
  'bg.auto': { en: 'Auto mode removes the background from the image corners.', es: 'El modo automático quita el fondo detectado en las esquinas.' },
  'bg.auto.help': { en: 'Click the image background to pick a specific color instead of using auto mode.', es: 'Haz clic en el fondo de la imagen para elegir un color específico en vez del modo automático.' },
  'bg.picking': { en: 'Removing the color you clicked. Both previews update automatically. Add more clicks to remove other background areas.', es: 'Quitando el color que tocaste. Ambas vistas se actualizan solas. Haz más clics para quitar otras zonas del fondo.' },
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
  'col.deleteColor.cancel': { en: 'Cancel', es: 'Cancelar' },
  'col.deleteColor.prompt': {
    en: 'Delete this color? Shapes using it move to the nearest color.',
    es: '¿Borrar este color? Las formas que lo usan pasan al color más cercano.',
  },
  'vec.paletteReset.confirm': {
    en: 'Reset the suggested palette? Your palette edits will be lost.',
    es: '¿Restaurar la paleta sugerida? Se perderán tus ediciones.',
  },
  'vec.paletteReset.confirmAction': { en: 'Yes, reset', es: 'Sí, restaurar' },
  'vec.paletteReset.cancel': { en: 'Cancel', es: 'Cancelar' },
  'col.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'col.pickerLabel': { en: 'New color', es: 'Nuevo color' },

  // Shape editor
  'shape.title': { en: 'Refine Shapes', es: 'Perfeccionar formas' },
  'shape.nodesSub': { en: 'Click a shape to show its points, then drag them to fix the silhouette.', es: 'Haz clic en una forma para ver sus puntos, luego arrástralos para corregir la silueta.' },
  'shape.brushSub': { en: 'Paint directly on the image to fill gaps or touch up areas.', es: 'Pinta directamente sobre la imagen para rellenar huecos o retocar zonas.' },
  'shape.modeNodes': { en: 'Move points', es: 'Mover puntos' },
  'shape.modeBrush': { en: 'Brush', es: 'Pincel' },
  'shape.nodesHint': { en: 'Click a shape in the preview to edit its points.', es: 'Haz clic en una forma del preview para editar sus puntos.' },
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
  'shape.deleteShape.cancel': { en: 'Cancel', es: 'Cancelar' },
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
  'tool.refine': { en: 'Refine', es: 'Refinar' },
  'tool.import': { en: 'Import', es: 'Importar' },
  'tool.vectorize': { en: 'Vectorize', es: 'Vectorizar' },
  'tool.eyedropper': { en: 'Eyedropper', es: 'Cuentagotas' },
  'tool.fill': { en: 'Fill', es: 'Rellenar' },
  'tool.erase': { en: 'Erase', es: 'Borrar' },
  'tool.erasePath': { en: 'Delete', es: 'Eliminar' },
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
    en: 'Adjust settings until the preview looks right, then continue to edit colors.',
    es: 'Ajusta los controles hasta que el preview se vea bien, luego sigue a editar colores.',
  },
  'tool.fill.hint': {
    en: 'Pick a color, then click a shape to paint it. Use Pick (I) to sample from the canvas.',
    es: 'Elige un color y haz clic en una forma para pintarla. Usa Tomar (I) para muestrear del lienzo.',
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
    en: 'Clean the palette, then compact shapes before download.',
    es: 'Limpia la paleta y compacta las formas antes de descargar.',
  },

  // Optimize inspector sections
  'optimize.paletteSection': { en: 'Palette', es: 'Paleta' },
  'optimize.optimizeSection': { en: 'File size', es: 'Tamaño de archivo' },
  'optimize.subtitle': {
    en: 'Clean the palette, then reduce shapes before download.',
    es: 'Limpia la paleta y luego reduce formas antes de descargar.',
  },
  'optimize.morePalette': { en: 'More palette tools', es: 'Más herramientas de paleta' },
  'optimize.moreCompression': { en: 'More compression', es: 'Más compresión' },

  // Workspace chrome
  'workspace.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'workspace.undo': { en: 'Undo', es: 'Deshacer' },
  'workspace.redo': { en: 'Redo', es: 'Rehacer' },
  'workspace.paths': { en: 'paths', es: 'formas' },
  'workspace.tools': { en: 'Tools', es: 'Herramientas' },
  'workspace.shortcutHint': {
    en: 'Letter keys switch tools — see keys under each icon.',
    es: 'Las letras cambian de herramienta — mira la tecla bajo cada icono.',
  },
  'workspace.moreToolsAfterVectorize': {
    en: 'Next: Fill (G) or Optimize. Shape tools live under Refine.',
    es: 'Siguiente: Rellenar (G) u Optimizar. Las formas están en Refinar.',
  },
  'workspace.replaceImage': { en: 'Replace image', es: 'Reemplazar imagen' },
  'workspace.replaceImage.confirm': {
    en: 'Clear this image and SVG? You can’t undo this.',
    es: '¿Borrar esta imagen y el SVG? No se puede deshacer.',
  },
  'workspace.replaceImage.confirmAction': { en: 'Yes, replace', es: 'Sí, reemplazar' },
  'workspace.replaceImage.cancel': { en: 'Cancel', es: 'Cancelar' },
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
