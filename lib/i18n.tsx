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
  'lang.toggle': { en: 'Español', es: 'English' },

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
  'vec.subtitle': { en: 'Adjust the settings — the preview, palette and file size update automatically.', es: 'Ajusta las opciones — la vista previa, la paleta y el tamaño se actualizan solos.' },
  'vec.original': { en: 'Original', es: 'Original' },
  'vec.originalPick': { en: 'Original — click background to remove', es: 'Original — clic en el fondo para quitarlo' },
  'vec.vector': { en: 'Vector SVG', es: 'SVG vectorial' },
  'vec.palette': { en: 'Palette', es: 'Paleta' },
  'vec.colors': { en: 'colors', es: 'colores' },
  'vec.color': { en: 'color', es: 'color' },
  'vec.download': { en: 'Download SVG', es: 'Descargar SVG' },
  'vec.continue': { en: 'Continue to Colors →', es: 'Continuar a Colores →' },
  'vec.revectorize': { en: 'Re-vectorize now', es: 'Re-vectorizar ahora' },
  'vec.auto': { en: 'Updates automatically as you adjust settings.', es: 'Se actualiza automáticamente al ajustar las opciones.' },
  'vec.vectorizing': { en: 'Vectorizing…', es: 'Vectorizando…' },
  'vec.optimized': { en: 'optimized', es: 'optimizado' },
  'vec.maxOptimize': { en: '⚡ Optimize to the max', es: '⚡ Optimizar al máximo' },
  'vec.maxOptimize.help': { en: 'Drastically reduces the number of points in every shape (Douglas–Peucker), flattening curves to lines. Much smaller file with a small loss of smoothness — ideal for logos and icons.', es: 'Reduce drásticamente la cantidad de puntos de cada forma (Douglas–Peucker), convirtiendo curvas en líneas. Archivo mucho más ligero con una pequeña pérdida de suavidad — ideal para logos e iconos.' },
  'vec.complexWarn': { en: '⚠ This image has many shapes (looks like a photo). SVG is not ideal for photos — the file will stay large. For photos, a PNG/WebP is usually smaller. Try fewer colors, more noise removal, or “Optimize to the max”.', es: '⚠ Esta imagen tiene muchas formas (parece una foto). El SVG no es ideal para fotos — el archivo seguirá siendo grande. Para fotos, un PNG/WebP suele ser más ligero. Prueba menos colores, más “quitar ruido”, o “Optimizar al máximo”.' },

  // Settings groups
  'set.basic': { en: 'Basic', es: 'Básico' },
  'set.advanced': { en: 'Advanced', es: 'Avanzado' },
  'set.presets': { en: 'Presets', es: 'Ajustes rápidos' },
  'set.preset.logo': { en: 'Logo / Flat color', es: 'Logo / Color plano' },
  'set.preset.sketch': { en: 'Sketch / Line art', es: 'Boceto / Líneas' },
  'set.preset.photo': { en: 'Photo', es: 'Foto' },

  // Settings controls
  'set.colors': { en: 'Colors', es: 'Colores' },
  'set.colors.hint': { en: 'Fewer = simpler shapes · More = detailed', es: 'Menos = formas simples · Más = detalle' },
  'set.colors.help': { en: 'How many distinct colors the vector will use. Fewer = simpler and a much smaller file; more = closer to the original.', es: 'Cuántos colores distintos usará el vector. Menos = más simple y archivo mucho más ligero; más = más fiel al original.' },
  'set.smoothing': { en: 'Smoothing', es: 'Suavizado' },
  'set.smoothing.help': { en: 'Higher straightens and simplifies edges (lighter file); lower keeps edges faithful.', es: 'Más alto endereza y simplifica los bordes (archivo más ligero); más bajo los mantiene fieles.' },
  'set.detail': { en: 'Detail', es: 'Detalle' },
  'set.detail.help': { en: 'Higher simplifies curves (lighter file); lower keeps fine curved detail.', es: 'Más alto simplifica las curvas (archivo más ligero); más bajo conserva el detalle.' },
  'set.stroke': { en: 'Stroke width', es: 'Grosor de borde' },
  'set.stroke.help': { en: 'Width of the outline around each shape. Set to 1 to drop strokes and shrink the file.', es: 'Grosor del contorno de cada forma. Ponlo en 1 para quitar bordes y reducir el archivo.' },
  'set.noise': { en: 'Noise removal', es: 'Quitar ruido' },
  'set.noise.hint': { en: 'Higher = drops tiny shapes → much smaller file.', es: 'Más alto = elimina formas diminutas → archivo mucho más ligero.' },
  'set.noise.help': { en: 'Removes shapes smaller than this — clears speckles. Higher = fewer tiny paths = smaller file.', es: 'Elimina formas más pequeñas que este valor — limpia motas. Más alto = menos paths diminutos = archivo más ligero.' },
  'set.precision': { en: 'Precision', es: 'Precisión' },
  'set.precision.hint': { en: 'Lower = fewer decimals → smaller file.', es: 'Más bajo = menos decimales → archivo más ligero.' },
  'set.precision.help': { en: 'Decimal places kept in coordinates. Lower = smaller file with a tiny loss of precision.', es: 'Decimales que se conservan en las coordenadas. Más bajo = archivo más ligero con una mínima pérdida de precisión.' },

  // Mode toggle
  'set.mode': { en: 'Mode', es: 'Modo' },
  'set.mode.color': { en: 'Color', es: 'Color' },
  'set.mode.lineart': { en: 'Line art', es: 'Líneas' },
  'set.mode.help': { en: 'Color: full-color tracing with ImageTracer. Line art: black & white tracing with VTracer — ideal for sketches and drawings.', es: 'Color: trazado a todo color con ImageTracer. Líneas: trazado en blanco y negro con VTracer — ideal para bocetos y dibujos.' },

  // Blur
  'set.blur': { en: 'Pre-blur', es: 'Desenfoque previo' },
  'set.blur.hint': { en: '0 = off · Higher = smoother edges, fewer paths.', es: '0 = desactivado · Más alto = bordes más suaves, menos paths.' },
  'set.blur.help': { en: 'Applies a light blur before tracing. Reduces noise and prevents fragmented paths. 0 disables it.', es: 'Aplica un desenfoque ligero antes de trazar. Reduce el ruido y evita paths fragmentados. 0 lo desactiva.' },

  // VTracer controls (lineart mode)
  'set.vt.speckle': { en: 'Speckle filter', es: 'Filtro de motas' },
  'set.vt.speckle.hint': { en: 'Higher = removes more tiny specs.', es: 'Más alto = elimina más motas pequeñas.' },
  'set.vt.speckle.help': { en: 'Removes stray pixels smaller than this size. Higher = cleaner result but may lose fine detail.', es: 'Elimina píxeles sueltos menores a este tamaño. Más alto = resultado más limpio pero puede perder detalle fino.' },
  'set.vt.corner': { en: 'Corner threshold', es: 'Umbral de esquinas' },
  'set.vt.corner.hint': { en: 'Higher = smoother corners.', es: 'Más alto = esquinas más suaves.' },
  'set.vt.corner.help': { en: 'Angle below which a point is treated as a corner. Higher = rounder shapes; lower = sharper corners.', es: 'Ángulo por debajo del cual un punto es tratado como esquina. Más alto = formas más redondeadas; más bajo = esquinas más marcadas.' },
  'set.vt.splice': { en: 'Curve tolerance', es: 'Tolerancia de curva' },
  'set.vt.splice.hint': { en: 'Higher = smoother, fewer segments.', es: 'Más alto = más suave, menos segmentos.' },
  'set.vt.splice.help': { en: 'How aggressively curves are joined. Higher = fewer path segments, smoother result.', es: 'Qué tan agresivamente se unen las curvas. Más alto = menos segmentos, resultado más suave.' },

  // Background removal
  'bg.remove': { en: 'Remove background', es: 'Quitar fondo' },
  'bg.auto': { en: 'Auto mode: removes background detected from the image corners. Click the background in the image to pick exactly which color to remove instead.', es: 'Modo automático: quita el fondo detectado en las esquinas. Haz clic en el fondo de la imagen para elegir exactamente qué color quitar.' },
  'bg.picking': { en: 'Removing the color you clicked. Both previews update automatically. Add more clicks to remove other background areas.', es: 'Quitando el color que tocaste. Ambas vistas se actualizan solas. Haz más clics para quitar otras zonas del fondo.' },
  'bg.contiguous': { en: 'Contiguous', es: 'Contiguo' },
  'bg.contiguous.help': { en: 'On: removes only the connected area touching your click. Off: removes that color everywhere in the image.', es: 'Activado: quita solo la zona conectada a tu clic. Desactivado: quita ese color en toda la imagen.' },
  'bg.tolerance': { en: 'Tolerance', es: 'Tolerancia' },
  'bg.tolerance.help': { en: 'How close a pixel must be to the picked color to be removed. Higher removes more shades.', es: 'Cuán cercano debe ser un píxel al color elegido para quitarlo. Más alto quita más tonos.' },
  'bg.tolerance.hint': { en: 'Higher = removes more shades of the picked color.', es: 'Más alto = quita más tonos del color elegido.' },
  'bg.clear': { en: 'Clear picked points', es: 'Limpiar puntos elegidos' },

  // Color editor
  'col.title': { en: 'Edit Colors', es: 'Editar colores' },
  'col.subtitle': { en: 'Click a color swatch or a path in the preview to select it, then pick a new color.', es: 'Haz clic en un color o en una forma del preview para seleccionarlo, luego elige un nuevo color.' },
  'col.eraseSub': { en: 'Erase mode: click any shape in the preview to delete it.', es: 'Modo borrar: haz clic en cualquier forma del preview para eliminarla.' },
  'col.undo': { en: 'Undo', es: 'Deshacer' },
  'col.redo': { en: 'Redo', es: 'Rehacer' },
  'col.erase': { en: 'Erase path mode', es: 'Modo borrar forma' },
  'col.erase.help': { en: 'When on, clicking a shape in the preview deletes it. Turn off to go back to editing colors.', es: 'Cuando está activo, al hacer clic en una forma se elimina. Desactívalo para volver a editar colores.' },
  'col.merge': { en: 'Merge similar colors', es: 'Unir colores parecidos' },
  'col.merge.help': { en: 'Combines shades that are close in color into one. Useful when a flat design vectorizes into many near-duplicate shades.', es: 'Combina tonos parecidos en uno. Útil cuando un diseño plano se vectoriza en muchos tonos casi iguales.' },
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
  'shape.nodesActive': { en: 'Drag the blue points to reshape. Click another shape to switch.', es: 'Arrastra los puntos azules para reformar. Haz clic en otra forma para cambiar.' },
  'shape.nodes.help': { en: 'Each blue circle is a point of the selected shape. Drag to move it; the curve follows. Use undo if you overshoot.', es: 'Cada círculo azul es un punto de la forma seleccionada. Arrástralo para moverlo; la curva lo sigue. Usa deshacer si te pasas.' },
  'shape.brushColor': { en: 'Color', es: 'Color' },
  'shape.brushSize': { en: 'Brush size', es: 'Tamaño del pincel' },
  'shape.brush.help': { en: 'Paints a vector stroke in the chosen color. Use it to fill a gap or cover an unwanted area. Pick a color matching the fill to blend in.', es: 'Pinta un trazo vectorial del color elegido. Úsalo para rellenar un hueco o tapar una zona no deseada. Elige un color igual al relleno para que se integre.' },
  'shape.continue': { en: 'Continue to Labels →', es: 'Continuar a Etiquetas →' },
  'shape.step': { en: 'Refine', es: 'Perfeccionar' },
  'shape.modeDelete': { en: '🗑 Erase', es: '🗑 Borrar' },
  'shape.deleteSub': { en: 'Click any shape in the preview to delete it. Use the list to find smaller bits.', es: 'Haz clic en cualquier forma del preview para borrarla. Usa la lista para encontrar trozos pequeños.' },
  'shape.shapes': { en: 'Shapes', es: 'Formas' },
  'shape.shape': { en: 'Shape', es: 'Forma' },
  'shape.noShapes': { en: 'No shapes.', es: 'Sin formas.' },
  'shape.deleteShape': { en: 'Delete shape', es: 'Borrar forma' },
  'shape.list.help': { en: 'Every shape in the SVG. Hover a row to highlight it in the preview; click the trash to delete it. Great for removing stray bits.', es: 'Cada forma del SVG. Pasa el cursor por una fila para resaltarla en el preview; pulsa la papelera para borrarla. Ideal para quitar trozos sueltos.' },
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
