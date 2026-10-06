# API NestJS

Servicio REST del monorepo. Para instalación, configuración de PostgreSQL/JWT, rutas y pruebas consulta [`../../README.md`](../../README.md) y [`../../GUIA_INSTALACION.md`](../../GUIA_INSTALACION.md).

Comandos desde la raíz: `npm run api`, `npm run build:api`, `npm run typecheck:api`, `npm run test:api` y `npm run test:api:e2e`. Los tests usan fixtures y mocks de PostgreSQL/SMTP.

La API espera una base cuyo esquema sea compatible con el contrato de `src/prisma/contract.prisma`. No aplica migraciones al iniciar. No conectes suites de prueba a una base real.
