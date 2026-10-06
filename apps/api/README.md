<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Paridad de Tickets: correo y configuración

Las notificaciones se integran únicamente al crear un ticket, asignar un agente
(cliente y agente) y cambiar manualmente su estado. Conservan los asuntos y textos
de Spring Boot; la prioridad y las consultas no generan correo. Se envían después
de confirmar la transacción. Un fallo SMTP se registra sin incluir credenciales,
destinatarios ni contenido y no revierte la operación.

El correo es opcional: `MAIL_USERNAME` y `MAIL_PASSWORD` habilitan Gmail SMTP en
`smtp.gmail.com:587`, con STARTTLS obligatorio y tiempos de espera de 10 segundos.
No se verifica SMTP durante el arranque. `SUPPORT_EMAIL` configura el remitente y
la respuesta; `MAIL_COPY_SUPPORT=true` añade copia oculta, salvo cuando soporte ya
es el destinatario. Vacío, soporte no utiliza `MAIL_USERNAME` como sustituto,
igual que el valor efectivo de `application.properties` en Spring Boot.

La configuración se obtiene al comprobar el permiso para crear tickets. Si falta,
se crea con los 20 indicadores en `true` y `varianteVisual=A`. Un bloqueo de tabla
y una segunda lectura dentro de la misma transacción evitan inserciones duplicadas
entre solicitudes NestJS. Una fila existente se devuelve sin actualizarla.
No se crea configuración al iniciar la API y no se requieren migraciones.

Las pruebas automáticas sustituyen tanto SMTP como PostgreSQL por dobles de prueba,
incluidos los casos con credenciales simuladas. Después de `npm run build`,
`node test/configuracion-postgres.validation.mjs` comprueba la configuración real
existente en una transacción `READ ONLY`, sin crear ni modificar registros.

## Comentarios, historial y adjuntos

Endpoints compatibles con Spring Boot:

- `GET /api/comentarios` (ADMIN y SUPERVISOR), `GET /api/comentarios/ticket/:ticketId`, `POST /api/comentarios` (201).
- `GET /api/historial-tickets` (ADMIN y SUPERVISOR), `GET /api/historial-tickets/ticket/:ticketId`.
- `GET /api/adjuntos/ticket/:ticketId`, `POST /api/adjuntos/ticket/:ticketId` (multipart `archivo`, 200), `GET /api/adjuntos/:id/descargar`.

El acceso se comparte con Tickets: ADMIN tiene acceso global; SUPERVISOR necesita
proyecto y compañía activos y asignación activa; AGENTE también debe tener asignado
el ticket; CLIENTE conserva acceso a sus tickets propios aunque pierda acceso al
proyecto. El listado global de comentarios filtra los tickets del SUPERVISOR,
corrigiendo la ausencia de ese filtro en Spring Boot según el requisito de acceso
por ticket/proyecto de esta migración.

CLIENTE solo publica y ve comentarios PUBLICO. Los demás roles admiten PUBLICO e
INTERNO en tickets accesibles. El usuario del DTO debe coincidir con el autenticado.
El primer comentario público de personal de soporte, según su rol persistido,
registra primera respuesta y cumplimiento SLA. Comentario, actualización del ticket
e historial se guardan juntos bajo bloqueo de ticket; el correo público sale tras
el commit. No se añade una restricción por estado CERRADO ni se altera el flujo de
RECURSO_EXTERNO.

El historial requiere configuración habilitada globalmente y para el rol; ADMIN
ignora solo su indicador individual. CLIENTE ve únicamente eventos de su autoría.
Por ticket se devuelve fechaCreacion descendente, como Spring Boot. No existe
endpoint de escritura manual; se conserva la escritura automática de Tickets.

Los adjuntos admiten PDF, DOC/DOCX, PNG/JPG/JPEG, TXT y XLS/XLSX hasta 10 MiB.
Se conserva la validación por extensión de Spring Boot; no se añade inspección del
contenido. Se guardan como UUID en `uploads/adjuntos` de la raíz del proyecto,
equivalente a Spring Boot e independiente del directorio de ejecución. También se
permite descargar archivos históricos de `apps/api/uploads/adjuntos`, validando
ambas ubicaciones contra traversal y enlaces simbólicos. No se trasladan archivos
ni se modifican registros existentes. Los archivos subidos nunca se versionan.
Las respuestas incluyen metadatos y urlDescarga, sin rutaArchivo. La descarga valida
el ticket antes del archivo, bloquea rutas externas y escapes por enlaces, devuelve
404 ante archivos ausentes/no legibles y utiliza attachment con nombre UTF-8.
Una persistencia fallida elimina el archivo recién creado. El límite multipart de
archivo devuelve 413; una solicitud con Content-Length mayor de 12 MiB devuelve 400.

Las pruebas HTTP usan fixtures y directorios temporales propios dentro de test/,
que se eliminan al finalizar. Tras compilar, `node test/actividad-postgres.validation.mjs`
comprueba lecturas reales de los tres módulos bajo READ ONLY y rollback, sin subir
archivos, escribir comentarios/historial ni enviar correo.
# Solicitudes de recursos externos

El módulo está registrado en `AppModule` y mantiene los contratos de Spring Boot:
`GET /api/solicitudes-recursos`, `GET /api/solicitudes-recursos/:id`,
`GET /api/solicitudes-recursos/ticket/:ticketId` y `PUT /api/solicitudes-recursos/:id`.
La creación se realiza mediante `POST /api/tickets` con `tipoAtencion: RECURSO_EXTERNO`
y `solicitudRecurso: { categoria, recurso, cantidad, observaciones? }`; no existe un POST separado en Spring Boot.

ADMIN consulta y administra globalmente. SUPERVISOR administra sus proyectos activos autorizados.
AGENTE solo consulta tickets asignados con acceso vigente; CLIENTE consulta sus propios tickets.
El flag global `solicitudesRecursosActivo` afecta todos los roles. Los flags específicos afectan
CLIENTE, AGENTE y SUPERVISOR; ADMIN conserva la excepción de Spring Boot.

El PUT administra campos, proveedor, fechas y estado. El flujo es NUEVO → EN_VALIDACION →
SOLICITADO_PROVEEDOR → ESPERANDO_PROVEEDOR → RECIBIDO → ENTREGADO → CERRADO;
SOLICITADO_PROVEEDOR permite también RECIBIDO. CANCELADO está disponible antes de RECIBIDO.
Proveedor obligatorio desde SOLICITADO_PROVEEDOR, estimación obligatoria para ESPERANDO_PROVEEDOR,
y entrega al cliente obligatoria para CERRADO. Las fechas de solicitud, recepción y entrega
se completan al entrar en sus estados si faltan. La solicitud CERRADO cierra automáticamente
el ticket y preserva sus fechas de cierre/resolución existentes. CANCELADO y ENTREGADO no lo cierran.
No se exige nota de cierre en este flujo, igual que Spring Boot. Los cambios se registran en historial.

La primera estimación se conserva; el retraso usa esa fecha original (o la estimación actual en registros antiguos).
Los días se calculan por fechas calendario y dejan de crecer con fechaRecepcion.
RETRASADO es una condición calculada, nunca un estado persistido.
Los correos por cambio de estado van al cliente, con copia a soporte según la configuración existente.
La revisión periódica avisa a SUPPORT_EMAIL y marca fechaNotificacionRetraso únicamente al enviar con éxito;
fallos de correo se reintentan y no rompen operaciones críticas. No se reinicia ese marcador al reprogramar,
igual que Spring Boot. La revisión inicia a los 60000 ms y se repite 3600000 ms después de terminar.
Se puede ajustar con APP_RECURSOS_RETRASOS_DELAY_INICIAL_MS y APP_RECURSOS_RETRASOS_INTERVALO_MS,
equivalentes a app.recursos.retrasos.delay-inicial-ms e intervalo-ms. No conecta al iniciar la API.

Las pruebas usan fixtures, repositorios simulados y SMTP simulado, sin escrituras reales.
Mejoras de seguridad respecto a Spring Boot: validaciones de longitud antes de PostgreSQL,
bloqueo del ticket durante actualizaciones concurrentes y correos de cambio de estado después del commit.
# Autenticación completa

Los cuatro endpoints mantienen HTTP 200 y contratos de Spring Boot:
`POST /api/auth/login` (`correo`, `password`), `POST /api/auth/cambiar-password`
(`passwordActual`, `nuevaPassword`), `POST /api/auth/solicitar-recuperacion` (`correo`)
y `POST /api/auth/confirmar-recuperacion` (`correo`, `codigo`, `nuevaPassword`).
Cambiar contraseña exige JWT y usa el correo del sujeto `sub`, sin permitir seleccionar otra cuenta.
Los demás endpoints son públicos. Los errores de negocio son 400; cambio con cuenta inactiva es 403
y autenticación ausente/inválida es 401. Los errores conocidos siguen el formato
`{ timestamp, status, error, message }`; errores inesperados mantienen una respuesta 500 genérica.

Solo cuentas activas pueden iniciar sesión, cambiar o recuperar contraseña. Login requiere rol asignado,
mantiene JWT de ocho horas y devuelve únicamente id, nombre, correo, rol y token.
El correo y las contraseñas se normalizan como Spring Boot. Se consulta el correo por igualdad,
sin comodines SQL. BCrypt tiene coste 10, acepta prefijos $2a$, $2b$ y $2y$; las contraseñas
antiguas correctas se migran automáticamente. La nueva contraseña debe tener seis caracteres
después de trim y ser distinta de la actual BCrypt. No se añaden reglas de composición.
Al establecer contraseñas nuevas se rechazan más de 72 bytes UTF-8, como BCrypt de Spring;
la comparación de contraseñas antiguas largas conserva la compatibilidad de Spring.

Recuperación usa generación criptográfica de seis dígitos, incluidos ceros iniciales; almacena
solo hash BCrypt, vence a los diez minutos y permite cinco intentos incorrectos. El quinto intento,
la expiración o el uso exitoso invalidan el código. Se acepta temporalmente el código antiguo en texto
plano, igual que Spring Boot. Una solicitud nueva elimina solo los códigos anteriores de ese correo.
La respuesta de solicitud es idéntica para correo existente, inexistente o inactivo. El código
original solo se envía por correo al usuario, sin copia a soporte y nunca aparece en la respuesta.
SMTP ausente o fallido no impide el arranque ni rompe la solicitud.

Se mantienen el contador y la invalidación antes de devolver errores. Solicitud, confirmación,
cambio y migración de contraseña heredada usan bloqueo de cuenta para impedir carreras; confirmar
actualiza la contraseña e invalida el código atómicamente. Los correos salen después del commit.
Spring Boot no implementa rate limiting adicional; se conserva su límite de cinco intentos por código.
Cambiar o recuperar contraseña no revoca JWT anteriores ni borra códigos por el cambio manual,
conservando el comportamiento original. Las pruebas usan fixtures y SMTP simulado, sin PostgreSQL real.
# Reportes y métricas

`ReportesModule` está registrado en `AppModule`. Se migran los cinco GET de Spring Boot:
`/api/reportes/resumen`, `/api/reportes/dashboard-resumen`, `/api/reportes/tickets-por-estado`,
`/api/reportes/tickets-por-prioridad` y `/api/reportes/tickets-por-tipo`.
Se mantienen los ocho campos del resumen y `{ nombre, total }` en los conteos;
estados históricos ASIGNADO/RESUELTO permanecen separados para que el frontend los agrupe.
Los conteos por estado/prioridad incluyen categorías con cero, ignoran mayúsculas/minúsculas sin trim.
Los tipos agrupan nombres exactos en orden de aparición; tipos sin nombre no se incluyen.

JWT y RolesGuard protegen todos los endpoints. El módulo exige `reportesActivos` y el flag por rol;
ADMIN ignora reportesAdmin pero respeta el global. Dashboard no consulta esos interruptores.
Spring identifica la cuenta por el correo `sub` y obtiene el rol persistido para calcular el alcance;
esta regla también se conserva. ADMIN ve todos los tickets, incluidos proyectos inactivos;
SUPERVISOR ve sus proyectos activos asignados; AGENTE sus tickets asignados dentro de esos proyectos;
CLIENTE sus tickets propios dentro de proyectos activos autorizados. Asignación, proyecto y compañía deben estar activos.

Todos los reportes salvo Dashboard admiten `companiaId` y `proyectoId`, combinados con AND.
Dashboard ignora filtros, igual que Spring. Un proyecto explícitamente no autorizado devuelve 403,
por requisito de seguridad de esta migración; Spring lo filtraba y devolvía datos vacíos.
No hay filtros de fecha ni reportes específicos por agente o SLA en el Spring Boot inspeccionado.
Los reportes por proyecto se obtienen aplicando proyectoId al mismo conjunto de métricas.

ADMIN sin filtros cuenta todos los usuarios; con filtros y otros roles cuenta usuarios relacionados
deduplicados (actor, clientes y agentes), incluido el actor aun con cero tickets. Los comentarios
pertenecen únicamente a tickets visibles; CLIENTE excluye solo INTERNO, incluidos sus espacios/mayúsculas,
y conserva null/otros tipos como Spring. Las respuestas contienen solo agregados, sin hashes, correos ni datos de tickets.
Se lee TicketsRepository directamente, sin llamar a TicketsService ni recalcular/persistir SLA.

El frontend existente llama también a `/api/reportes/operacion-resumen` y `/api/reportes/recursos-resumen`,
pero estos endpoints no existen en el Spring Boot inspeccionado. NestJS los implementa para completar
ese contrato sin cambiar el frontend: operacion-resumen devuelve totalOperativos y los cinco estados;
recursos-resumen devuelve totalSolicitudes, nuevas, enValidacion, solicitadasProveedor, esperandoProveedor,
recibidas, entregadas, cerradas, canceladas, retrasadas, proximasEntregas y promedioDiasProveedor.
La separación operativa usa la misma regla del Dashboard (todo excepto RECURSO_EXTERNO, incluido legacy).
Los recursos provienen solo de tickets externos visibles y obedecen permisos de Reportes.
El retraso reutiliza la fecha original y las reglas del módulo de solicitudes. Las próximas entregas
usan la estimación actual entre ahora y siete días, inclusivos, excluyendo estados finalizados.
El promedio es la media de días fraccionarios entre solicitud a proveedor y recepción; fechas ausentes
o invertidas se excluyen y un conjunto vacío da cero. Estas dos rutas completan una ausencia de Spring,
por lo que no se afirma paridad 1:1 con un cálculo Java inexistente.

Las pruebas de reportes usan fixtures y repositorios simulados; no escriben en PostgreSQL real
ni envían correos. No se añaden dependencias ni migraciones.
# Configuración del sistema y auditoría

`ConfiguracionSistemaModule` está registrado en `AppModule`. Endpoints de Spring Boot:
`GET /api/configuracion-sistema` para cualquier usuario autenticado,
`PUT /api/configuracion-sistema` y `GET /api/configuracion-sistema/auditoria` solo ADMIN.
JWT y RolesGuard protegen las rutas. La consulta no depende de interruptores de módulos
ni del acceso a proyectos: es configuración global del sistema.

El DTO contiene veinte booleanos: cuatro estados globales y cuatro permisos por rol
para Crear Ticket, Solicitudes de Recursos, Reportes e Historial. Los cuatro globales
son obligatorios en PUT; los dieciséis permisos son opcionales y null/ausente conserva
el valor existente. Un valor antiguo null se lee como true, sin sobrescribirlo en GET.
Los veinte defaults son true y la columna de compatibilidad varianteVisual es A al crear.
La inicialización existente se reutiliza: no escribe al arrancar ni duplica configuración.
GET excluye id y varianteVisual. Campos ajenos al DTO se ignoran, sin persistirlos;
no se modifican credenciales ni columnas de compatibilidad. Los booleanos se validan
estrictamente, sin aceptar conversiones implícitas desde strings/números de Jackson.

Cada campo realmente cambiado genera un registro de auditoría con módulo, rol afectado,
valorAnterior/valorNuevo como "true"/"false" ("null" para registro anterior legacy),
fechaCambio y datos del actor. usuarioId viene de las claims del JWT, usuarioCorreo de sub
y usuarioNombre del registro de usuario; si no existe, se conserva el correo como nombre,
igual que Spring Boot. La auditoría incluye también los snapshots globales antiguos de
Crear Ticket, Reportes e Historial. Las columnas varianteAnterior/varianteNueva se guardan
como A por compatibilidad, pero no se exponen en el DTO de auditoría. El correo del actor
forma parte del contrato original y solo ADMIN puede consultar estos datos.

Un PUT sin cambios no guarda ni audita; crear defaults tampoco genera auditoría.
La auditoría se lista por fechaCambio DESC y conserva registros antiguos con campos
detallados null. No existe endpoint de escritura manual de auditoría.
Se mantiene el orden de registro de Spring: globales, Crear Ticket, Recursos, Reportes, Historial.
Actualización, inicialización si falta y auditoría comparten una transacción con el mismo
bloqueo de tabla usado por la inicialización previa. Un fallo revierte todo y solicitudes
concurrentes conservan cambios por rol omitidos, sin duplicar registros de configuración.
Tickets, Recursos, Reportes e Historial siguen leyendo el mismo servicio y los mismos flags;
se mantienen las excepciones ADMIN y Dashboard ya migradas.

Las pruebas usan fixtures/mocks y no escriben datos permanentes en PostgreSQL real.
No se modifican Spring Boot, Prisma, estructura de base de datos ni migraciones.

## Enlaces compartidos

`EnlacesCompartidosModule` está registrado en `AppModule`. Contratos de Spring Boot:

- `POST /api/tickets/:ticketId/compartir`: ADMIN/SUPERVISOR, 201.
- `GET /api/tickets/:ticketId/enlaces-compartidos`: ADMIN/SUPERVISOR, 200, creación descendente.
- `DELETE /api/tickets/enlaces-compartidos/:enlaceId`: ADMIN/SUPERVISOR, 200, revocación idempotente sin borrar.
- `GET /api/public/compartidos/:token`: público sin JWT, 200.

El rol persistido y el usuario identificado por el correo del JWT se comprueban además
de los guards. SUPERVISOR requiere acceso al proyecto del ticket; ADMIN tiene alcance global.
El token es una pareja de UUID v4 criptográficos como Spring. Vence en siete días por defecto,
o en la fecha local solicitada posterior al momento actual y como máximo treinta días después.
Tokens desconocidos devuelven 404; revocados, expirados, sin permiso de lectura o con
ticket/proyecto/compañía no disponibles devuelven 403. La expiración exacta ya está vencida.
Se aceptan tokens históricos; no se exige que los existentes tengan formato UUID.

Todos los enlaces nuevos y los DTO de enlaces antiguos son de solo lectura. El DTO público
contiene únicamente el ticketId del contrato original, número, título, descripción, estado,
prioridad, categoría, nombres de cliente/agente, fechas y flags. Nunca incluye correo, token,
hash, rutas, entidades completas, comentarios, historial ni adjuntos. No existen rutas públicas
para consultar o escribir esas entidades. La lectura pública no actualiza SLA ni el ticket.

Crear otro enlace genera un token independiente y conserva el anterior: Spring no tiene
endpoint específico de regeneración. No registra auditoría ni historial, ni consulta un flag
global de enlaces. Se reutiliza NotificacionService; el correo se envía después de persistir,
sin copia a soporte, y su fallo no rompe la creación. FRONTEND_URL conserva el fallback
http://localhost:8081 y apunta a /ticket-compartido.html?token=... del frontend existente.

Diferencia de representación: ids Long mayores que Number.MAX_SAFE_INTEGER se devuelven
como cadenas decimales para evitar pérdida de precisión en JavaScript; los demás son números.
El correo y token del destinatario solo aparecen en el contrato protegido ADMIN/SUPERVISOR.
Pruebas aisladas con mocks y fixtures; no se escribe en PostgreSQL real ni se envía correo real.
