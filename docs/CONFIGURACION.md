# Configuración y estructura

- `src/app`: rutas y pantallas Next.js.
- `src/lib`: datos y lógica compartida.
- `public`: recursos públicos, nunca documentos privados.
- `tests`: comprobaciones del dominio.

Sin telemetría propia, anuncios ni fuentes cargadas desde servicios externos. La telemetría de Next.js puede desactivarse con `NEXT_TELEMETRY_DISABLED=1`.

## Persistencia y despliegue propio

`APP_URL` debe ser el origen exacto que visita el navegador. Usa HTTPS fuera de localhost. Las mutaciones comprueban Origin y las sesiones se envían en cookies HTTP-only, SameSite=Strict y Secure cuando APP_URL usa HTTPS. No publiques `.env.local`.

`DATA_DIR` contiene la base SQLite (`app.sqlite`, WAL y SHM). Pliegora añade `files/` con los PDF. El directorio debe ser privado, escribible y persistente, fuera de `public` y del repositorio. Las sesiones duran ocho horas. Solo se almacena el hash del token de sesión.

Esta versión admite una instancia Node con disco persistente. No la despliegues como funciones efímeras ni con réplicas independientes: perderías datos o separarías los estados. Mantén copias coherentes de SQLite con su herramienta de backup o deteniendo la aplicación; incluye los archivos asociados. Aplica permisos del sistema y una política de retención propia.

Para servir mediante un proxy local utiliza `npm start`; el proceso escucha en 127.0.0.1. El proxy proporciona HTTPS y límites de tamaño/solicitudes. No confíes en exponer directamente el puerto de desarrollo. Los límites internos son básicos por instalación/cuenta, no sustituyen protección del servidor.

## Tarifas y pedidos

`src/lib/pricing.mjs` concentra los precios de ejemplo en céntimos. Adapta catálogo, cantidades mínimas, impuesto y acabados antes de usarlos comercialmente. El servidor cuenta las páginas del PDF y recalcula el precio; no acepta un total elegido por el cliente. El pedido se guarda con un token aleatorio de seguimiento cuyo hash queda en SQLite. El token viaja en el fragmento de la URL y se envía a la API mediante Authorization, no como query string.

`ADMIN_PASSWORD` no tiene valor por defecto y debe tener 16 caracteres o más. El panel solo permite transiciones válidas de estado. Rotar la contraseña no invalida las sesiones ya abiertas: si necesitas revocación inmediata, detén la aplicación y elimina las filas de `sessions` con una herramienta SQLite de administración.

Las descargas PDF exigen sesión de administración o token de pedido. Se entregan como adjuntos, con no-store y nosniff. No hay análisis antimalware ni comprobación de calidad de impresión. Nunca abras documentos desconocidos con herramientas sin actualizar. Los documentos de prueba son ficticios.
