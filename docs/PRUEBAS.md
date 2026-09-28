# Pruebas y límites de esta edición

Preparación: 28–29 de septiembre de 2026. Entorno local: macOS 27.0, Node 23.10.0 y Chrome 153.0.8010.53, perfil aislado. Configuración de CI: Node 22 sobre Ubuntu, sin secretos. El runtime de Functions está fijado a Node 22; la comprobación en esa versión se realizará en CI al publicar.

## Resultado local

- `npm test`: 3 pruebas correctas.
- `npm run build`: correcto, TypeScript sin errores.
- Navegador: PDF real de dos páginas; dos ejemplares suman 48 céntimos con configuración de ejemplo. Seguimiento protegido, rechazo sin token, panel protegido, CSRF, cambios de estado y descarga autorizada.
- Capturas reales en `docs/screenshots`; datos ficticios. Las cuatro aplicaciones web se revisaron a 1440 y 390 px, con imágenes cargadas y sin desbordamiento horizontal en portada.
- La secuencia completa de navegador terminó sin errores de JavaScript.

## Límites

No pagos, envíos, preflight/antivirus, pruebas de carga ni operación comercial.

No se han enviado datos de clientes, gastado cuota de IA, creado recursos cloud ni realizado transacciones. Las respuestas simuladas se utilizan únicamente para probar contratos y controles: no se presentan como resultados del proveedor ni se usan en capturas de éxito. Consulta CONFIGURACION.md antes de exponer un servidor.

Las dependencias de producción se han revisado con `npm audit --omit=dev` durante la preparación. No es una auditoría de seguridad externa ni garantiza ausencia de vulnerabilidades futuras.
