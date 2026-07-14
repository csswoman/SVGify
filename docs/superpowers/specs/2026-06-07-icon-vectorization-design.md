# Diseno: vectorizacion limpia para iconos

## Objetivo

El producto esta orientado a iconos. La vectorizacion debe producir SVG livianos, con pocos paths y una paleta pequena, sin perder la forma principal del icono.

Para imagenes como el ejemplo, el resultado esperado es un SVG tipo icono: fondo blanco eliminado, contorno negro dominante, rellenos crema y rosa, y gris solo cuando aporte sombra o separacion visual. Los gradientes y tonos intermedios se pueden sacrificar si ayudan a reducir peso y ruido.

## Criterios de exito

- Mantener la silueta y las proporciones reconocibles del icono original.
- Usar una paleta objetivo de 4 colores: negro, crema, rosa y gris sombra.
- Eliminar el fondo blanco del SVG final.
- Evitar que pequenos cambios de tono creen colores o paths adicionales.
- Reducir paths pequenos o ruidosos que no cambian la lectura del icono.
- Mejorar la apariencia de los bordes, evitando contornos quebrados por simplificacion excesiva.
- Mantener el SVG final liviano para uso como asset de icono.

## Enfoque recomendado

Agregar un preset o modo llamado "Icono limpio" dentro del flujo de vectorizacion.

Este modo debe preparar la imagen antes del trazado, forzando una paleta reducida orientada a iconos. En vez de dejar que el trazador detecte muchos tonos similares, la app debe reagrupar los pixeles visibles en pocos colores dominantes y descartar el fondo. Luego el trazado debe generar menos regiones y el post-proceso debe limpiar colores y paths residuales.

## Pipeline propuesto

1. Remover fondo blanco o casi blanco antes de vectorizar.
2. Suavizar ligeramente la imagen de entrada para reducir ruido de pixeles y bordes duros.
3. Cuantizar a una paleta pequena, con preferencia por negro, crema, rosa y gris.
4. Vectorizar usando pocos colores y un umbral de omision de paths mas alto que el modo general.
5. Normalizar la paleta resultante para fusionar tonos cercanos en los colores objetivo.
6. Eliminar paths pequenos, transparentes o blancos.
7. Optimizar el SVG sin destruir curvas utiles; la simplificacion debe reducir peso, pero no convertir curvas suaves en poligonos feos.
8. Sellar pequenas separaciones visuales entre regiones con stroke del mismo color cuando ayude al renderizado.

## UI

El usuario debe tener una opcion clara para iconos, sin tener que entender parametros tecnicos.

Propuesta:

- Agregar preset "Icono limpio" junto a los presets actuales.
- Configurar por defecto 4 colores.
- Mantener controles avanzados para usuarios que quieran ajustar suavizado, detalle y ruido.
- Mostrar la paleta final y el peso del SVG como ya hace la pantalla actual.

## Decisiones tecnicas

- El modo debe priorizar pocos colores y formas estables sobre fidelidad fotografica.
- El blanco debe tratarse como fondo, no como color de icono, salvo que el usuario desactive explicitamente la remocion de fondo.
- La paleta debe normalizarse despues del trazado para evitar variaciones como varios rosas, varios cremas o varios negros.
- La simplificacion geometrica debe ser menos destructiva en el modo de iconos que en la optimizacion maxima, porque la forma del borde es mas importante que exprimir cada byte.

## Riesgos

- Si el usuario sube un icono donde el blanco es parte importante del dibujo, removerlo por defecto puede perder informacion.
- Una paleta fija de 4 colores puede ser demasiado agresiva para algunos iconos multicolor.
- Sellar bordes con stroke del mismo color puede aumentar un poco el peso, aunque suele mejorar la apariencia visual.

## Validacion

- Comparar visualmente el original y el SVG generado para verificar que la silueta se conserva.
- Verificar que la paleta final no exceda 4 colores en el modo "Icono limpio".
- Verificar que el fondo blanco no aparezca como path visible.
- Medir cantidad de paths y tamano del SVG antes y despues.
- Probar con iconos con sombras suaves y con iconos planos para asegurar que el preset no solo funciona en una imagen.
