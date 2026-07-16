# Línea base de perfiles de vectorización

Ejecutada el 2026-07-16 con `public/svgify.svg` y los fixtures de `test/fixtures/vectorize/`.

```powershell
$env:VECTORIZE_PROFILE_REPORT='1'
npx vitest run lib/vectorizeProfiles.fixture.test.ts --reporter verbose
Remove-Item Env:VECTORIZE_PROFILE_REPORT
```

| Fixture / perfil | Paths | Colores | Bytes | Tiempo | Hash SVG |
|---|---:|---:|---:|---:|---|
| Icono · Limpio | 7 | 7 | 2,976 | 28 ms | `f8eb8c214dcd` |
| Icono · Equilibrado | 7 | 7 | 2,976 | 28 ms | `f8eb8c214dcd` |
| Icono · Más detalle | 7 | 7 | 2,976 | 27 ms | `f8eb8c214dcd` |
| Ilustración · Equilibrado | 7 | 7 | 3,751 | 11 ms | `82ed117a5b65` |
| Imagen ruidosa · Equilibrado | 5 | 5 | 1,573 | 31 ms | `67a01f5e9728` |
| Transparencia · Equilibrado | 59 | 57 | 21,719 | 20 ms | `ae219177afea` |

Esta prueba mide el trazador Node directamente para mantenerla rápida y determinista. La integración de worker (preprocesado, compresión y transporte) se valida por separado mediante sus pruebas de contrato. Los hashes sirven como diagnóstico, no como snapshots de aceptación rígidos.
