# Sistema de Gestión de Incidencias

> **Estado actual:** frontend Astro (`http://localhost:4321`), backend NestJS (`http://localhost:3000`) y PostgreSQL. Spring Boot y el frontend HTML/CSS/JavaScript se conservan como referencia legacy y evidencia de la migración; no son la aplicación activa.

Sistema web para registrar, asignar y dar seguimiento a incidencias de compañías y proyectos. La API valida la identidad, el rol y el alcance de acceso a cada proyecto o ticket. La interfaz Astro presenta las operaciones disponibles según la sesión y el rol.

## Estado actual

- **Frontend:** Astro con SSR, páginas protegidas, navegación por rol y cliente HTTP centralizado.
- **Backend:** NestJS y TypeScript, organizado en módulos de dominio.
- **Base de datos:** PostgreSQL existente, accedida por NestJS mediante el cliente y contrato Prisma del repositorio.
- **Autenticación:** JWT con vigencia de 8 horas y contraseñas BCrypt.
- **Puertos locales:** Astro `4321`, API `3000` y PostgreSQL normalmente `5432`.
- **Spring Boot:** implementación legacy, conservada en `src/`, `pom.xml` y `mvnw` como referencia; no es el backend activo.

## Evolución del proyecto

La versión original utilizaba un backend Java/Spring Boot, un frontend legacy de HTML, CSS y JavaScript, y PostgreSQL. Después se migraron progresivamente las funciones del sistema a un backend NestJS y una interfaz Astro. PostgreSQL se mantuvo como base de datos y se conservaron JWT y BCrypt como mecanismos de autenticación y protección de contraseñas.

Spring Boot y sus páginas estáticas permanecen en el repositorio para consultar la implementación previa y documentar la migración. La ejecución y las instrucciones de este README corresponden a NestJS + Astro.

## Cambios principales realizados

- Migración funcional progresiva de Spring Boot a módulos REST en NestJS.
- Migración del frontend HTML/JavaScript a páginas Astro con navegación y sesión compartidas.
- Centralización del cliente HTTP y manejo de sesión JWT, expiración, `401` y `403`.
- Aplicación de autorización por rol, proyecto y ticket en la API.
- Implementación de login, cambio y recuperación de contraseña, con BCrypt y códigos temporales.
- Flujos de tickets con asignación, prioridad, estado, comentarios, historial, adjuntos y recursos externos.
- Administración de usuarios, compañías, proyectos, asignaciones y roles.
- Reportes, configuración, auditoría y enlaces compartidos de solo lectura.
- Notificaciones de correo opcionales y pruebas automatizadas de API y frontend.
- Organización del repositorio como monorepo y documentación de instalación, arquitectura, demo y benchmark.

## Arquitectura actual

```text
Navegador → Astro :4321 → API NestJS :3000 → PostgreSQL :5432
                                  └→ SMTP opcional
```

Astro contiene las páginas, navegación protegida, interfaz responsive y cliente HTTP. Las solicitudes a `/api` llegan a NestJS mediante el proxy de desarrollo; en despliegue deben pasar por un proxy inverso o una configuración CORS restringida. NestJS organiza controladores, servicios, validación y guards por dominio. Los servicios aplican los permisos y consultan PostgreSQL. La API no ejecuta migraciones automáticamente.

La autenticación utiliza JWT firmado con `JWT_SECRET`. Los guards validan el token y el rol; los servicios comprueban además las asignaciones a proyectos y la relación con cada ticket. El frontend cierra la sesión ante `401` y presenta acceso denegado ante `403`, pero la autorización efectiva siempre corresponde al backend.

Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para el flujo y los módulos con más detalle.

## Funcionalidades implementadas

### Autenticación y seguridad

- Inicio de sesión con correo y contraseña; la contraseña se verifica con BCrypt. El token de sesión vence después de 8 horas.
- Cambio de contraseña con comprobación de la contraseña actual.
- Recuperación mediante código temporal enviado por correo cuando SMTP está configurado. El código vence a los 10 minutos, admite hasta cinco intentos fallidos y queda invalidado al usarse o bloquearse.
- La aplicación no devuelve contraseñas ni hashes en los DTO administrativos. La interfaz no conserva la contraseña introducida. El logout elimina la sesión del navegador; la expiración también se atiende al recibir `401`.
- Las rutas protegidas requieren JWT. `401` indica sesión ausente, inválida o expirada; `403` indica falta de autorización.
- Los controles ocultos en Astro mejoran la navegación, pero no sustituyen los guards y las comprobaciones del backend.

### Roles y alcance

La API reconoce `ADMIN`, `SUPERVISOR`, `AGENTE` y `CLIENTE`. Los permisos concretos también dependen de la configuración activa y de las asignaciones. El backend es la autoridad final.

| Rol | Alcance y operaciones principales |
|---|---|
| **ADMIN** | Acceso global sujeto a las reglas de cada módulo. Administra usuarios, compañías, proyectos, asignaciones y configuración; consulta auditoría y reportes; gestiona tickets y enlaces compartidos. |
| **SUPERVISOR** | Opera sobre proyectos/tickets autorizados. Puede asignar agentes, cambiar prioridad/estado, seguir solicitudes de recursos, consultar reportes habilitados y crear/revocar enlaces compartidos dentro del alcance permitido. |
| **AGENTE** | Accede a proyectos asignados y tickets que las reglas del backend le permiten consultar. Puede cambiar estado y prioridad, comentar y usar las operaciones permitidas de adjuntos. La edición de solicitudes de recursos está reservada a ADMIN/SUPERVISOR. |
| **CLIENTE** | Crea tickets si el módulo y su permiso están activos; consulta los tickets permitidos, agrega comentarios públicos y accede a adjuntos e historial según las reglas vigentes. No puede leer comentarios internos ni añadirlos. |

La asignación de proyecto activa delimita el acceso de SUPERVISOR, AGENTE y CLIENTE; ADMIN tiene alcance global. El acceso a tickets se valida además sobre el ticket solicitado. Las banderas de configuración pueden deshabilitar ciertos módulos por rol.

### Tickets

El sistema permite crear y listar tickets, consultar su detalle y aplicar filtros disponibles en la interfaz. Los datos incluyen título/descripción, tipo de incidencia, prioridad, estado, proyecto, cliente, agente asignado y fechas. El flujo usa los estados `NUEVO`, `ASIGNADO`, `EN_PROGRESO`, `RESUELTO` y `CERRADO`.

La prioridad se guarda como `P1_CRITICA`, `P2_ALTA`, `P3_MEDIA` o `P4_BAJA`; impacto y urgencia participan en su cálculo cuando aplica. ADMIN/SUPERVISOR pueden asignar agentes. ADMIN/SUPERVISOR/AGENTE pueden cambiar estado o prioridad, sujetos a validación de transición y acceso. Para pasar a `EN_PROGRESO` debe existir un agente asignado; el cierre requiere una nota.

El backend calcula fechas límite e indicadores de SLA de respuesta/resolución: por prioridad, la respuesta vence a los 30, 60, 240 o 480 minutos; la resolución, a las 4, 8, 24 o 72 horas respectivamente. En tickets de recurso externo no aplica plazo de resolución. El detalle expone estados como en tiempo, en riesgo (desde 75 % del plazo), vencido, cumplido o incumplido. La primera respuesta de personal autorizado registra su resultado. Los reportes no exponen un endpoint independiente de SLA.

### Comentarios e historial

Los comentarios pertenecen a un ticket y quedan asociados al usuario y fecha. Se clasifican como `PUBLICO` o `INTERNO`; los clientes solo reciben comentarios públicos y no pueden crear internos. La creación del comentario actualiza la fecha del ticket y registra el evento correspondiente en el historial. Los comentarios públicos pueden generar notificación por correo si SMTP está disponible.

El historial registra automáticamente eventos como cambios de estado/prioridad y otras acciones del ticket, con usuario, valores anterior/nuevo, descripción y fecha. La consulta por ticket devuelve los eventos en orden descendente por fecha y la vista global de Astro los ordena del más reciente al más antiguo. Está sujeto a las banderas de historial por rol. No hay una operación de escritura manual de historial desde la interfaz. Para clientes, los eventos visibles se filtran según las reglas del backend.

### Adjuntos

Los usuarios autorizados pueden subir y descargar archivos vinculados a un ticket. Se admiten PDF, DOC/DOCX, PNG, JPG/JPEG, TXT, XLS/XLSX, con un límite de 10 MiB y un archivo por solicitud. El archivo se guarda en el área local de uploads con nombre de almacenamiento UUID y permisos de archivo restringidos; la metadata se registra junto al ticket en PostgreSQL.

La API valida el nombre y extensión, comprueba que la ruta permanezca dentro del almacenamiento configurado y valida el acceso al ticket antes de entregar el archivo. Un archivo inexistente o ilegible devuelve error de recurso no encontrado. Los uploads son datos locales: no se versionan en Git y deben incluirse en el plan de respaldo/retención del despliegue.

### Recursos externos

Un ticket puede contener una solicitud de recurso relacionada. Se registran datos de recurso, cantidad, proveedor, fechas y estado; los estados admitidos por el contrato incluyen `NUEVO`, `EN_VALIDACION`, `SOLICITADO_PROVEEDOR`, `ESPERANDO_PROVEEDOR`, `RECIBIDO`, `ENTREGADO`, `CERRADO` y `CANCELADO`. ADMIN/SUPERVISOR pueden actualizarla y el backend registra los cambios. El cierre de la solicitud puede cerrar el ticket relacionado según las reglas del servicio.

Existe un job de seguimiento de entregas vencidas; “retrasado” es una condición de alerta, no un estado persistido de la solicitud. Los cambios y alertas pueden notificar por correo si está configurado. Las consultas se limitan por rol, proyecto y ticket.

### Usuarios, compañías, proyectos y asignaciones

- **Usuarios:** listado, creación, edición, activación/desactivación, rol y proyectos asignados. Las operaciones administrativas se protegen por rol. Las respuestas no exponen contraseñas, hashes ni tokens.
- **Compañías:** listado, detalle, creación, edición y activación/desactivación. Sus proyectos se consultan por compañía; la modificación administrativa se reserva a ADMIN.
- **Proyectos:** listado según el acceso del usuario, detalle, compañía asociada y usuarios asignados. ADMIN administra proyectos; los demás roles solo consultan los que les autoriza el backend.
- **Asignaciones:** asociación/desasociación lógica usuario-proyecto y consulta por usuario/proyecto. Las asignaciones se activan/desactivan y conservan el vínculo para auditoría/datos existentes. El rol dentro de cada asignación se muestra cuando existe en el modelo.

### Reportes

Los endpoints existentes ofrecen resumen de dashboard/general (totales de tickets, conteos por estado, usuarios relacionados o total global cuando corresponde, y comentarios permitidos), tickets por estado, prioridad y tipo, resumen de tickets operativos, y resumen de recursos. Este último contiene totales por estado, atrasados, entregas previstas para los próximos siete días y promedio de días entre solicitud al proveedor y recepción cuando hay fechas válidas. Los filtros aceptados son compañía y proyecto; el alcance de resultados se limita por rol y asignaciones. Las métricas visibles dependen de los datos y de las banderas de reporte. No existe endpoint separado de reportes SLA.

### Configuración y auditoría

La configuración gestiona banderas booleanas para habilitar globalmente y por rol los módulos de creación de tickets, solicitudes de recursos, reportes e historial. La lectura requiere sesión; la actualización está reservada a ADMIN. Se valida el tipo booleano y se requieren las banderas globales de los módulos. No se editan desde esta API credenciales, secretos ni variables de entorno.

Cada cambio efectivo de configuración se persiste con su registro de auditoría dentro de una transacción. La auditoría expone usuario, rol, módulo, fecha, valores anteriores/nuevos y contexto de las banderas; se consulta en orden descendente. La ruta de auditoría está reservada a ADMIN y la interfaz no permite escritura manual.

### Enlaces compartidos

ADMIN/SUPERVISOR pueden crear un enlace de solo lectura para un ticket autorizado, listar sus enlaces y revocarlos. Por defecto vence en siete días; puede indicarse otra fecha futura hasta un máximo de 30 días. No existe una operación independiente de regeneración: se crea un enlace nuevo. La lectura pública no requiere JWT y valida token, estado activo y expiración.

El DTO público permite consultar información acotada del ticket (identificador/número, título, descripción, estado, prioridad, categoría, nombres del cliente/agente y fechas). No habilita comentarios, adjuntos ni cambios. No expone correo del cliente, hashes, JWT, rutas internas ni historial/comentarios privados. Los enlaces pueden enviarse por correo opcional; un fallo de correo no revierte su creación.

### Notificaciones

El envío SMTP Gmail es opcional y se configura mediante variables de entorno. Se usa para eventos como recuperación de contraseña, creación/asignación/cambio de estado de ticket, comentarios públicos, enlaces compartidos y eventos de recursos donde corresponda. Si SMTP no está configurado, el transporte no se crea. Los errores de correo se manejan sin revertir operaciones de negocio que ya fueron aceptadas; no se registran credenciales ni contenido sensible en logs.

### Frontend Astro

La aplicación incluye login, dashboard, páginas de tickets y sus acciones, administración de usuarios/compañías/proyectos, reportes, configuración, auditoría, gestión de enlaces y la vista pública del ticket compartido. Un cliente HTTP centralizado adjunta la sesión JWT y procesa los errores comunes. Las páginas protegidas atienden la expiración, muestran estados de carga/error/vacío y ocultan controles no permitidos.

El sidebar responsive puede expandirse y colapsarse desde su encabezado. En modo compacto conserva el logo como control para expandir; el branding se adapta al estado. En pantallas pequeñas conserva el patrón de navegación móvil tipo drawer.

## Instalación y ejecución

### Requisitos

- Node.js 22.12 o posterior y npm 9.6.5 o posterior.
- PostgreSQL 15 o posterior, con base y esquema compatible ya preparados.
- Microsoft Edge para las pruebas Playwright actuales de `apps/web`.
- Java 17 solo si se necesita consultar/ejecutar Spring Boot legacy; no es requisito de la aplicación activa.

### Pasos

```powershell
git clone <URL_DEL_REPOSITORIO>
cd gestionincidencias-
npm install
npm install --prefix apps/api
npm install --prefix apps/web
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Edita los `.env` locales. Configura `DATABASE_URL` a una base PostgreSQL cuyo esquema ya esté preparado, genera un `JWT_SECRET` aleatorio de al menos 32 bytes y establece `FRONTEND_URL=http://localhost:4321`. El correo SMTP es opcional. Nunca publiques `.env` ni pongas secretos en `PUBLIC_API_URL`.

La aplicación no ejecuta migraciones al arrancar. No apuntes a una base real ni ejecutes SQL de `database/` sin autorización, revisión del script y confirmación del destino.

Inicia ambos servicios desde la raíz con `npm run dev`, o usa terminales separadas con `npm run api` y `npm run web`.

- **Frontend:** <http://localhost:4321>
- **Login:** <http://localhost:4321/login>
- **Backend:** <http://localhost:3000> (`GET /` comprueba que responde)
- **PostgreSQL:** normalmente `localhost:5432`

Consulta [GUIA_INSTALACION.md](GUIA_INSTALACION.md) para solución de problemas y ejecución compilada.

## Variables de entorno

Los nombres y placeholders seguros están en [apps/api/.env.example](apps/api/.env.example) y [apps/web/.env.example](apps/web/.env.example).

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Cadena PostgreSQL de la API. |
| `JWT_SECRET` | Secreto privado para firmar JWT. |
| `PORT` | Puerto HTTP de NestJS; predeterminado `3000`. |
| `FRONTEND_URL` | Origen Astro usado al generar enlaces compartidos; `http://localhost:4321` en desarrollo. Si falta, la implementación conserva un fallback legacy `:8081`; configurar esta variable evita ese comportamiento. |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Credenciales SMTP opcionales; vacías deshabilitan el envío. |
| `SUPPORT_EMAIL`, `MAIL_COPY_SUPPORT` | Destino de soporte y copia opcional. |
| `APP_RECURSOS_RETRASOS_DELAY_INICIAL_MS`, `APP_RECURSOS_RETRASOS_INTERVALO_MS` | Tiempo inicial e intervalo del job de alertas de recursos. |
| `PUBLIC_API_URL` | URL de la API para el proxy de desarrollo/build-preview de Astro; ejemplo `http://localhost:3000`. No admite secretos. |

## Pruebas y validación

Desde la raíz del repositorio:

```powershell
npm run build          # compila API y frontend
npm run check          # astro check
npm run typecheck:api  # TypeScript de la API
npm run test:api       # pruebas unitarias API
npm run test:api:e2e   # pruebas HTTP/E2E API con fixtures
npm run test:web:e2e   # build API y pruebas Playwright Astro
npm test               # suites API unitarias, API E2E y web E2E
```

No se publican cantidades de pruebas porque pueden cambiar con el repositorio. Las pruebas de backend usan dobles/fixtures que evitan PostgreSQL y SMTP reales; Playwright usa servicios de prueba. `npm run test:legacy:e2e` es una suite aparte para el frontend Spring legacy y requiere su entorno. El árbol `e2e/` conserva pruebas del frontend legacy.

## Endpoints

La API agrupa sus rutas bajo `/api`: autenticación (`/api/auth`), usuarios (`/api/usuarios`), compañías (`/api/companias`), proyectos (`/api/proyectos`), asignaciones (`/api/usuario-proyectos`), tickets (`/api/tickets`), comentarios, historial, adjuntos, solicitudes de recursos, reportes, configuración y enlaces compartidos. La lectura pública está en `/api/public/compartidos/:token` y no requiere JWT; su respuesta está limitada por el backend.

## Estructura del monorepo

```text
apps/
  api/       NestJS, contrato Prisma/PostgreSQL, unit tests y HTTP/E2E tests
  web/       Astro SSR, componentes, páginas y Playwright
database/    SQL y material de referencia de datos/esquema
scripts/     Orquestación local y utilidades
docs/        Documentación archivada de instalación/migración y evidencia
e2e/         Pruebas Playwright del frontend legacy
src/         Backend Spring Boot y frontend estático legacy
pom.xml      Build Maven de Spring Boot legacy
mvnw         Wrapper Maven legacy
```

## Datos demo y limitaciones conocidas

No hay usuarios ni contraseñas demo publicadas aquí. Usa cuentas autorizadas y datos ficticios en una base de demostración. SMTP depende de credenciales locales; sin SMTP la aplicación funciona, pero no entrega correos. El benchmark comparativo de recursos Spring/NestJS no produjo mediciones reproducibles de todas las métricas; consulta [BENCHMARK.md](BENCHMARK.md), que marca lo no medido sin inventar resultados. Los indicadores SLA se reflejan en los datos de tickets; no existe un endpoint independiente de reportes SLA. Los uploads requieren un plan de respaldo fuera de Git.

## Seguridad

No versionar `.env`, contraseñas, hashes, JWT, claves privadas, dumps de producción ni archivos reales de `uploads/`. Usa credenciales de mínimo privilegio y secretos distintos por entorno. Para despliegue expuesto, utiliza HTTPS, proxy inverso y CORS restringido. La base y su esquema deben prepararse por el procedimiento aprobado; la API no los migra al iniciar.

## Documentación

- [Guía de instalación](GUIA_INSTALACION.md)
- [Arquitectura](ARCHITECTURE.md)
- [Checklist de demo](DEMO_CHECKLIST.md)
- [Metodología y resultados del benchmark](BENCHMARK.md)
- [Auditoría de paridad de migración](docs/migration/AUDITORIA-PARIDAD.md)
