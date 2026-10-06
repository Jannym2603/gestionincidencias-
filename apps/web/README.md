# Frontend Astro

Aplicación Astro SSR para el monorepo. Las rutas protegidas consumen la API NestJS por `/api`; en desarrollo Vite proxifica esa ruta a `PUBLIC_API_URL`.

Desde la raíz: `npm run web`, `npm run build:web`, `npm run check` y `npm run test:web:e2e`. Para todos los pasos, variables y puertos consulta [`../../README.md`](../../README.md) y [`../../GUIA_INSTALACION.md`](../../GUIA_INSTALACION.md).

`PUBLIC_API_URL` no debe contener secretos. En un despliegue compilado, configura un proxy inverso `/api` al backend o CORS limitado explícitamente al origen web. Playwright usa un backend de prueba local, fixtures y Edge; no requiere PostgreSQL ni correo.
