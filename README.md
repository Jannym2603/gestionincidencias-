# Sistema de Gestión de Incidencias

Monorepo para registrar y gestionar incidencias de varias compañías y proyectos. La aplicación activa está formada por una API NestJS, una interfaz Astro y PostgreSQL. El frontend legacy y el backend Spring Boot se conservan como referencia de la migración.

## Arquitectura y tecnologías

- **API:** NestJS, TypeScript, Prisma ORM PostgreSQL y Node.js.
- **Web:** Astro con SSR y adaptador Node, TypeScript, HTML y CSS.
- **Persistencia:** PostgreSQL. La API usa el contrato Prisma derivado del esquema existente.
- **Seguridad:** JWT (vigencia de 8 horas), roles y alcance por proyecto; contraseñas verificadas con BCrypt.
- **Correo:** SMTP Gmail opcional; sin credenciales SMTP, la aplicación continúa sin enviar correo.
- **Legacy:** Spring Boot/Java y sus páginas estáticas permanecen en `src/` y `src/main/resources/static/`; no son necesarios para ejecutar NestJS + Astro.

```text
Navegador → Astro :4321 → API NestJS :3000 → PostgreSQL :5432
                                  └→ SMTP (opcional)
```

## Estructura del monorepo

```text
apps/api/       API NestJS, pruebas y contrato de datos
apps/web/       Aplicación Astro y pruebas de navegador
database/       SQL de referencia/demostración y actualizaciones existentes
e2e/            Pruebas Playwright del frontend legacy Spring
src/            Aplicación Spring Boot y frontend legacy conservados
scripts/        Orquestación local del monorepo
```

## Requisitos

- Node.js 22.12 o posterior y npm 9.6.5 o posterior (Astro 7 fija estos mínimos).
- PostgreSQL 15 o posterior, con una base y usuario preparados.
- Navegador Microsoft Edge para las pruebas Playwright actuales de `apps/web`; los tests usan `channel: msedge`.

No es necesario instalar Java/Maven para ejecutar la aplicación NestJS + Astro. Java 17 sigue siendo necesario solo para el backend legacy.

## Instalación

Desde PowerShell en la raíz:

```powershell
npm install
npm install --prefix apps/api
npm install --prefix apps/web
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Completa `apps/api/.env` con la URL de la base existente y genera un `JWT_SECRET` privado de al menos 32 bytes. En PowerShell se puede generar con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarda el resultado solo en el `.env` local. No compartas ni versionees ese archivo. La API no ejecuta migraciones al iniciar; su contrato espera el esquema existente. Para una base vacía, revisa `database/` y coordina la preparación del esquema antes de usarla; no ejecutes scripts SQL sin verificar primero su propósito y destino.

## Variables de entorno

Los ejemplos están en [`apps/api/.env.example`](apps/api/.env.example) y [`apps/web/.env.example`](apps/web/.env.example). Variables principales:

| Variable | Aplicación | Uso |
|---|---|---|
| `DATABASE_URL` | API | Conexión PostgreSQL; obligatoria. |
| `JWT_SECRET` | API | Firma de JWT; obligatorio, al menos 32 bytes aleatorios. |
| `PORT` | API | Puerto HTTP, predeterminado `3000`. |
| `FRONTEND_URL` | API | Base para construir enlaces compartidos; predeterminado `http://localhost:8081`. Para la demo local, usar `http://localhost:4321`. |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | API | Usuario y contraseña SMTP Gmail opcionales. Dejar vacíos desactiva el transporte. |
| `SUPPORT_EMAIL` | API | Dirección de soporte opcional. |
| `MAIL_COPY_SUPPORT` | API | `true` para copiar notificaciones a soporte; predeterminado `false`. |
| `APP_RECURSOS_RETRASOS_DELAY_INICIAL_MS` | API | Espera inicial del job de alertas; predeterminado `60000`. |
| `APP_RECURSOS_RETRASOS_INTERVALO_MS` | API | Intervalo posterior del job; predeterminado `3600000`. |
| `PUBLIC_API_URL` | Web | URL de API para compilación/preview; predeterminado `http://localhost:3000`. En desarrollo Astro proxifica `/api` a esta URL. |

No pongas contraseñas o secretos en variables con prefijo `PUBLIC_`: Astro puede incorporarlas al bundle del navegador.

## Ejecución local

Terminales separadas:

```powershell
npm run api
npm run web
```

O inicia ambos procesos desde la raíz:

```powershell
npm run dev
```

URLs locales: Astro `http://localhost:4321`; API `http://localhost:3000` (endpoint raíz `GET /`, respuesta básica). PostgreSQL suele escuchar en `5432`. El puerto `8081` corresponde al frontend legacy Spring y no forma parte del arranque Astro.

La web usa proxy de desarrollo para `/api`. El proceso de producción de Astro sirve desde `apps/web/dist/server/entry.mjs`; configura `PUBLIC_API_URL` al compilar y un reverse proxy `/api` hacia NestJS, o configura CORS restringido al origen web si se despliegan separados.

## Compilación y pruebas

```powershell
npm run build          # builds API y Web
npm run check          # Astro check
npm run test:api       # unitarias API (Vitest; mocks y fixtures)
npm run test:api:e2e   # HTTP API con fixtures
npm run test:web:e2e   # navegador, API de prueba en memoria y Astro
npm test               # ejecuta las suites anteriores en secuencia
```

También existen `npm run typecheck:api`, `npm run test:legacy:e2e` (requiere Spring arriba) y `npm run test:web:e2e`. Las pruebas Nest tienen mocks que bloquean el acceso a PostgreSQL y SMTP; las E2E Astro levantan una API de fixture. Revisa las salidas de cada comando. No se ejecutan migraciones como parte de estos scripts.

## Funcionalidades

- Login, dashboard y control de sesión JWT.
- Tickets, comentarios, historial, adjuntos, asignación, estado, prioridad y solicitudes de recursos externos.
- Usuarios, roles, compañías, proyectos y asignaciones entre usuarios/proyectos.
- Reportes, configuración y auditoría de cambios.
- Enlaces compartidos de solo lectura y vista pública de tickets.
- Permisos en API y navegación/acciones web según rol y proyecto.

## Roles

`ADMIN` administra usuarios, compañías, proyectos, configuración, auditoría y reportes globales. `SUPERVISOR` gestiona los tickets y recursos dentro de sus proyectos autorizados. `AGENTE` trabaja sobre incidencias asignadas y operaciones permitidas. `CLIENTE` crea y consulta sus tickets autorizados. La API es la autoridad final y responde `401` para sesión ausente/inválida y `403` para falta de permisos.

## Endpoints

La API expone rutas bajo `/api`, entre ellas `/api/auth`, `/api/usuarios`, `/api/companias`, `/api/proyectos`, `/api/tickets`, `/api/tickets/:id/comentarios`, `/api/tickets/:id/historial`, `/api/tickets/:id/adjuntos`, `/api/solicitudes-recursos`, `/api/reportes`, `/api/configuracion-sistema`, `/api/tickets/:id/enlaces-compartidos` y `/api/public/compartidos/:token`. La ruta pública no requiere JWT y entrega campos limitados por el backend. Los detalles de acceso se validan en controladores y servicios; no se debe inferir autorización solo por ocultar un botón.

## Datos de demo y límites conocidos

No se publican usuarios ni contraseñas demo en el repositorio. Usa cuentas creadas por el proceso autorizado del proyecto y datos ficticios en una base de demostración. SMTP es opcional; sin él, los mensajes no se envían, así que simula o explica esa parte durante la demo. La API usa el esquema PostgreSQL existente y no inicializa una base vacía automáticamente. Los uploads son datos locales y deben respaldarse por separado.

## Seguridad

No versionar `.env`, contraseñas, hashes, JWT, claves privadas, dumps de producción ni adjuntos reales. BCrypt protege las contraseñas almacenadas. JWT requiere una clave local aleatoria y larga. Mantén PostgreSQL y SMTP configurados con credenciales de mínimo privilegio. No expongas el servicio Astro/Node directamente a internet sin HTTPS y proxy/configuración de producción apropiados.

## Estado de migración

La migración funcional a NestJS + Astro está completa según las auditorías del proyecto. El backend Spring Boot y el frontend legacy se conservan como referencia y como fuente para la comparación visual/funcional; no se han eliminado ni forman parte del arranque principal documentado aquí. Persisten posibles diferencias menores de presentación descritas en los informes de auditoría.

Consulta [`GUIA_INSTALACION.md`](GUIA_INSTALACION.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DEMO_CHECKLIST.md`](DEMO_CHECKLIST.md) y [`BENCHMARK.md`](BENCHMARK.md) para pasos ampliados.
