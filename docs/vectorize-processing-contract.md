# Contrato actual de procesamiento de Vectorizar

La aplicación prepara la imagen en un Web Worker y envía píxeles RGBA comprimidos a `POST /api/vectorize`. El endpoint de Next.js ejecuta `@neplex/vectorizer` en Node.js y devuelve un SVG editable.

## Límites verificables

- Máximo por lado: 8.192 px.
- Máximo total: 16.000.000 píxeles (aprox. 64 MB RGBA antes de comprimir).
- El worker aborta la petición `fetch` activa cuando el usuario cambia los ajustes o cancela el trazado. El servidor puede terminar una operación que ya hubiese empezado; el resultado cancelado se descarta en el cliente.
- El payload RGBA comprimido inválido devuelve un error recuperable `400`.

El endpoint continúa aceptando el transporte multipart anterior durante despliegues graduales. El worker de la aplicación usa exclusivamente el payload RGBA comprimido.

## Límites de comunicación

El producto puede afirmar que genera un SVG editable. No debe afirmar que el procesamiento es local, que no usa red ni que los archivos nunca salen del dispositivo.

La retención, el registro y la ubicación de datos son decisiones operativas del despliegue, no propiedades demostrables por este repositorio. Cualquier copy sobre ellas requiere una política publicada y verificable.
