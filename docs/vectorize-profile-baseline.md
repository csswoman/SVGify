# Línea base de perfiles de vectorización

Ejecutada el 2026-07-15 con `validation-icon.png` y los fixtures de `test/fixtures/vectorize/`.

```powershell
$env:VECTORIZE_PROFILE_REPORT='1'
npx vitest run lib/vectorizeProfiles.fixture.test.ts --reporter verbose
Remove-Item Env:VECTORIZE_PROFILE_REPORT
```

| Fixture / perfil | Paths | Colores | Bytes | Tiempo | Hash SVG |
|---|---:|---:|---:|---:|---|
| Icono · Limpio | 33 | 32 | 11,258 | 162 ms | `a3c8c0b3ae6e` |
| Icono · Equilibrado | 79 | 79 | 20,979 | 172 ms | `cc6c1d55a4c3` |
| Icono · Más detalle | 78 | 78 | 20,887 | 171 ms | `f3e3a507f35a` |
| Ilustración · Equilibrado | 7 | 7 | 3,751 | 19 ms | `82ed117a5b65` |
| Imagen ruidosa · Equilibrado | 5 | 5 | 1,573 | 46 ms | `67a01f5e9728` |
| Transparencia · Equilibrado | 59 | 57 | 21,719 | 31 ms | `ae219177afea` |

Esta prueba mide el trazador Node directamente para mantenerla rápida y determinista. La integración de worker (preprocesado, compresión y transporte) se valida por separado mediante sus pruebas de contrato. Los hashes sirven como diagnóstico, no como snapshots de aceptación rígidos.
