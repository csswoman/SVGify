# Checklist manual de Vectorizar

Esta comprobación sigue pendiente de una sesión en navegador antes de publicar cambios de UI.

- Probar Ilustración y Logo o icono con Limpio, Equilibrado y Más detalle usando los fixtures de `test/fixtures/vectorize/`.
- Comparar original y SVG a 100 %, 200 % y 400 %; anotar silueta, colores, paths, bytes y tiempo.
- Confirmar que Quitar fondo revela Tolerancia, y que Limpieza de borde transparente aparece solo con alpha semitransparente.
- Recorrer Modo, Detalle, Colores, Fondo, Paleta y Optimizar solo con teclado; confirmar foco visible y estado anunciado al vectorizar.
- Revisar inglés y español, tema claro/oscuro y 200 % de zoom sin desbordamiento horizontal del inspector.
- Tras editar colores, paths o etiquetas, descargar SVG y abrirlo en un visor independiente.
- Probar una imagen que supere 16 millones de píxeles y confirmar un error claro y recuperable.
