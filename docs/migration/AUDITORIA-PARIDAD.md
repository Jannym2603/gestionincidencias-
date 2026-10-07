# Auditoría final Spring Boot / NestJS

Spring: 64; Nest: 67; frontend: 53; faltantes Spring: 0; faltantes frontend: 0; duplicados Nest: 0.

Inventario generado del AST de controllers Nest y llamadas JS/HTML, y anotaciones Spring. Las columnas de contratos/reglas reflejan revisión manual y pruebas, no solo existencia de rutas. Parámetros normalizados como {id}.

## Matriz completa

| Módulo | Método | Spring | Nest | Implementado | Contrato equivalente | Seguridad equivalente | Reglas equivalentes | Observaciones |
|---|---|---|---|---|---|---|---|---|
| EnlaceCompartido | DELETE | /api/tickets/enlaces-compartidos/{id} | /api/tickets/enlaces-compartidos/{id} | SI | NO | SI | SI | Long superiores al máximo seguro JS se serializan como texto decimal; ids habituales numéricos. |
| Adjunto | GET | /api/adjuntos/{id}/descargar | /api/adjuntos/{id}/descargar | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Adjunto | GET | /api/adjuntos/ticket/{id} | /api/adjuntos/ticket/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Comentario | GET | /api/comentarios | /api/comentarios | SI | SI | NO | NO | Listado del supervisor limitado a sus tickets; mejora de seguridad conservada. |
| Comentario | GET | /api/comentarios/ticket/{id} | /api/comentarios/ticket/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | GET | /api/companias | /api/companias | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | GET | /api/companias/{id} | /api/companias/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | GET | /api/companias/activas | /api/companias/activas | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| ConfiguracionSistema | GET | /api/configuracion-sistema | /api/configuracion-sistema | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| ConfiguracionSistema | GET | /api/configuracion-sistema/auditoria | /api/configuracion-sistema/auditoria | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| HistorialTicket | GET | /api/historial-tickets | /api/historial-tickets | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| HistorialTicket | GET | /api/historial-tickets/ticket/{id} | /api/historial-tickets/ticket/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | GET | /api/proyectos | /api/proyectos | SI | SI | NO | NO | Extensión existente para AGENTE/CLIENTE; alcance filtrado por proyectos activos. Mejora conservada. |
| Proyecto | GET | /api/proyectos/{id} | /api/proyectos/{id} | SI | SI | NO | NO | Extensión existente para AGENTE/CLIENTE; alcance filtrado por proyectos activos. Mejora conservada. |
| Proyecto | GET | /api/proyectos/activos | /api/proyectos/activos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | GET | /api/proyectos/compania/{id} | /api/proyectos/compania/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | GET | /api/proyectos/compania/{id}/activos | /api/proyectos/compania/{id}/activos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| EnlaceCompartido | GET | /api/public/compartidos/{id} | /api/public/compartidos/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Reporte | GET | /api/reportes/dashboard-resumen | /api/reportes/dashboard-resumen | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Reporte | GET | /api/reportes/resumen | /api/reportes/resumen | SI | NO | NO | NO | Proyecto ajeno explícito: 403 en vez de agregados vacíos; mejora conservada. |
| Reporte | GET | /api/reportes/tickets-por-estado | /api/reportes/tickets-por-estado | SI | NO | NO | NO | Proyecto ajeno explícito: 403 en vez de agregados vacíos; mejora conservada. |
| Reporte | GET | /api/reportes/tickets-por-prioridad | /api/reportes/tickets-por-prioridad | SI | NO | NO | NO | Proyecto ajeno explícito: 403 en vez de agregados vacíos; mejora conservada. |
| Reporte | GET | /api/reportes/tickets-por-tipo | /api/reportes/tickets-por-tipo | SI | NO | NO | NO | Proyecto ajeno explícito: 403 en vez de agregados vacíos; mejora conservada. |
| Rol | GET | /api/roles | /api/roles | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| SolicitudRecurso | GET | /api/solicitudes-recursos | /api/solicitudes-recursos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| SolicitudRecurso | GET | /api/solicitudes-recursos/{id} | /api/solicitudes-recursos/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| SolicitudRecurso | GET | /api/solicitudes-recursos/ticket/{id} | /api/solicitudes-recursos/ticket/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | GET | /api/tickets | /api/tickets | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | GET | /api/tickets/{id} | /api/tickets/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| EnlaceCompartido | GET | /api/tickets/{id}/enlaces-compartidos | /api/tickets/{id}/enlaces-compartidos | SI | NO | SI | SI | Long superiores al máximo seguro JS se serializan como texto decimal; ids habituales numéricos. |
| TipoIncidencia | GET | /api/tipos-incidencia | /api/tipos-incidencia | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | GET | /api/usuario-proyectos | /api/usuario-proyectos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | GET | /api/usuario-proyectos/mis-proyectos | /api/usuario-proyectos/mis-proyectos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | GET | /api/usuario-proyectos/proyecto/{id} | /api/usuario-proyectos/proyecto/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | GET | /api/usuario-proyectos/usuario/{id} | /api/usuario-proyectos/usuario/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | GET | /api/usuario-proyectos/usuario/{id}/todas | /api/usuario-proyectos/usuario/{id}/todas | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioRol | GET | /api/usuario-roles | /api/usuario-roles | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Usuario | GET | /api/usuarios | /api/usuarios | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Usuario | GET | /api/usuarios/me | /api/usuarios/me | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Adjunto | POST | /api/adjuntos/ticket/{id} | /api/adjuntos/ticket/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Auth | POST | /api/auth/cambiar-password | /api/auth/cambiar-password | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Auth | POST | /api/auth/confirmar-recuperacion | /api/auth/confirmar-recuperacion | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Auth | POST | /api/auth/login | /api/auth/login | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Auth | POST | /api/auth/solicitar-recuperacion | /api/auth/solicitar-recuperacion | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Comentario | POST | /api/comentarios | /api/comentarios | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | POST | /api/companias | /api/companias | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | POST | /api/proyectos | /api/proyectos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | POST | /api/tickets | /api/tickets | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| EnlaceCompartido | POST | /api/tickets/{id}/compartir | /api/tickets/{id}/compartir | SI | NO | SI | SI | Long superiores al máximo seguro JS se serializan como texto decimal; ids habituales numéricos. |
| UsuarioProyecto | POST | /api/usuario-proyectos | /api/usuario-proyectos | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Usuario | POST | /api/usuarios | /api/usuarios | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | PUT | /api/companias/{id} | /api/companias/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Compania | PUT | /api/companias/{id}/estado | /api/companias/{id}/estado | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| ConfiguracionSistema | PUT | /api/configuracion-sistema | /api/configuracion-sistema | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | PUT | /api/proyectos/{id} | /api/proyectos/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Proyecto | PUT | /api/proyectos/{id}/estado | /api/proyectos/{id}/estado | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| SolicitudRecurso | PUT | /api/solicitudes-recursos/{id} | /api/solicitudes-recursos/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | PUT | /api/tickets/{id}/asignar | /api/tickets/{id}/asignar | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | PUT | /api/tickets/{id}/estado | /api/tickets/{id}/estado | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Ticket | PUT | /api/tickets/{id}/prioridad | /api/tickets/{id}/prioridad | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | PUT | /api/usuario-proyectos/{id}/activar | /api/usuario-proyectos/{id}/activar | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| UsuarioProyecto | PUT | /api/usuario-proyectos/{id}/desactivar | /api/usuario-proyectos/{id}/desactivar | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Usuario | PUT | /api/usuarios/{id} | /api/usuarios/{id} | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| Usuario | PUT | /api/usuarios/{id}/estado | /api/usuarios/{id}/estado | SI | SI | SI | SI | Contrato y flujo legacy conservados; ver mejoras transversales. |
| AppController | GET | — | / | SI | NO | NO | NO | Respuesta técnica existente Hello World. |
| ReportesController | GET | — | /api/reportes/operacion-resumen | SI | NO | NO | NO | Intencional: el frontend consume este reporte que Spring no implementa. |
| ReportesController | GET | — | /api/reportes/recursos-resumen | SI | NO | NO | NO | Intencional: el frontend consume este reporte que Spring no implementa. |

## URLs consumidas por el frontend legacy

| Método | URL /api | Existe en Nest | Primera referencia |
|---|---|---|---|
| DELETE | /api/tickets/enlaces-compartidos/{id} | SI | src\main\resources\static\ticket-detalle.js:4830 |
| GET | /api/adjuntos/{id}/descargar | SI | src\main\resources\static\ticket-detalle.js:4401 |
| GET | /api/adjuntos/ticket/{id} | SI | src\main\resources\static\ticket-detalle.js:4249 |
| GET | /api/comentarios/ticket/{id} | SI | src\main\resources\static\ticket-detalle.js:3892 |
| GET | /api/companias | SI | src\main\resources\static\companias-proyectos.js:164 |
| GET | /api/configuracion-sistema | SI | src\main\resources\static\app.js:158 |
| GET | /api/configuracion-sistema/auditoria | SI | src\main\resources\static\configuracion.js:387 |
| GET | /api/historial-tickets/ticket/{id} | SI | src\main\resources\static\historial.js:59 |
| GET | /api/proyectos | SI | src\main\resources\static\companias-proyectos.js:168 |
| GET | /api/public/compartidos/{id} | SI | src\main\resources\static\ticket-compartido.js:29 |
| GET | /api/reportes/dashboard-resumen | SI | src\main\resources\static\dashboard.js:238 |
| GET | /api/reportes/operacion-resumen | SI | src\main\resources\static\reportes.js:516 |
| GET | /api/reportes/recursos-resumen | SI | src\main\resources\static\reportes.js:562 |
| GET | /api/reportes/tickets-por-estado | SI | src\main\resources\static\reportes.js:415 |
| GET | /api/reportes/tickets-por-prioridad | SI | src\main\resources\static\reportes.js:420 |
| GET | /api/reportes/tickets-por-tipo | SI | src\main\resources\static\reportes.js:425 |
| GET | /api/solicitudes-recursos | SI | src\main\resources\static\dashboard.js:336 |
| GET | /api/solicitudes-recursos/ticket/{id} | SI | src\main\resources\static\ticket-detalle.js:792 |
| GET | /api/tickets | SI | src\main\resources\static\dashboard.js:23 |
| GET | /api/tickets/{id} | SI | src\main\resources\static\ticket-detalle.js:256 |
| GET | /api/tickets/{id}/enlaces-compartidos | SI | src\main\resources\static\ticket-detalle.js:4627 |
| GET | /api/tipos-incidencia | SI | src\main\resources\static\crear-ticket.js:905 |
| GET | /api/usuario-proyectos/mis-proyectos | SI | src\main\resources\static\crear-ticket.js:365 |
| GET | /api/usuario-proyectos/proyecto/{id} | SI | src\main\resources\static\proyecto-detalle.js:1978 |
| GET | /api/usuario-proyectos/usuario/{id} | SI | src\main\resources\static\crear-ticket.js:402 |
| GET | /api/usuario-proyectos/usuario/{id}/todas | SI | src\main\resources\static\companias-proyectos.js:1131 |
| GET | /api/usuarios | SI | src\main\resources\static\companias-proyectos.js:172 |
| GET | /api/usuarios/me | SI | src\main\resources\static\configuracion.js:607 |
| POST | /api/adjuntos/ticket/{id} | SI | src\main\resources\static\crear-ticket.js:1840 |
| POST | /api/auth/cambiar-password | SI | src\main\resources\static\configuracion.js:734 |
| POST | /api/auth/confirmar-recuperacion | SI | src\main\resources\static\login.js:153 |
| POST | /api/auth/login | SI | src\main\resources\static\login.js:26 |
| POST | /api/auth/solicitar-recuperacion | SI | src\main\resources\static\login.js:124 |
| POST | /api/comentarios | SI | src\main\resources\static\ticket-detalle.js:4030 |
| POST | /api/companias | SI | src\main\resources\static\companias-proyectos.js:1462 |
| POST | /api/proyectos | SI | src\main\resources\static\companias-proyectos.js:1574 |
| POST | /api/tickets | SI | src\main\resources\static\crear-ticket.js:1711 |
| POST | /api/tickets/{id}/compartir | SI | src\main\resources\static\ticket-detalle.js:4524 |
| POST | /api/usuario-proyectos | SI | src\main\resources\static\companias-proyectos.js:1335 |
| POST | /api/usuarios | SI | src\main\resources\static\usuarios.js:655 |
| PUT | /api/companias/{id} | SI | src\main\resources\static\companias-proyectos.js:1462 |
| PUT | /api/companias/{id}/estado | SI | src\main\resources\static\companias-proyectos.js:1639 |
| PUT | /api/configuracion-sistema | SI | src\main\resources\static\app.js:185 |
| PUT | /api/proyectos/{id} | SI | src\main\resources\static\companias-proyectos.js:1574 |
| PUT | /api/proyectos/{id}/estado | SI | src\main\resources\static\companias-proyectos.js:1690 |
| PUT | /api/solicitudes-recursos/{id} | SI | src\main\resources\static\solicitudes-recursos.js:1425 |
| PUT | /api/tickets/{id}/asignar | SI | src\main\resources\static\ticket-detalle.js:3452 |
| PUT | /api/tickets/{id}/estado | SI | src\main\resources\static\ticket-detalle.js:3552 |
| PUT | /api/tickets/{id}/prioridad | SI | src\main\resources\static\ticket-detalle.js:3621 |
| PUT | /api/usuario-proyectos/{id}/activar | SI | src\main\resources\static\companias-proyectos.js:1368 |
| PUT | /api/usuario-proyectos/{id}/desactivar | SI | src\main\resources\static\companias-proyectos.js:1368 |
| PUT | /api/usuarios/{id} | SI | src\main\resources\static\usuarios.js:694 |
| PUT | /api/usuarios/{id}/estado | SI | src\main\resources\static\usuarios.js:760 |

## Contratos y pruebas

- Auth: correo/password; passwordActual/nuevaPassword; correo/codigo/nuevaPassword. Cuatro POST 200; recuperación genérica.
- Usuarios: nombre/apellido/correo/rol/password/telefono; password opcional al editar; estado requiere {estado:boolean}. POST 201; PUT/GET 200; errores de negocio 400. Respuestas incluyen rol/telefono y nunca password.
- Compañías: nombre/descripcion?/estado?; proyectos añaden companiaId. POST 201, PUT 200. Cambiar estado usa un booleano JSON directo. Proyectos incluyen companiaNombre.
- Accesos: POST usuarioId/proyectoId 201; reactivación sin duplicar; PUT activar/desactivar sin body 200. DTO plano usuarioNombre/usuarioCorreo/proyectoNombre/companiaNombre/fechaAsignacion/estado. ADMIN global; SUPERVISOR su ámbito; CLIENTE sus asignaciones; AGENTE mis-proyectos.
- Tickets: título/descripcion/tipoIncidenciaId/clienteId/proyectoId/impacto/urgencia/tipoAtencion?/solicitudRecurso?. OPERATIVO por defecto; normalización. Asignar agenteId; estado estado/notaResolucion; prioridad prioridad/usuarioId/justificacion. POST 201; PUT/GET 200; inexistentes 400 como Spring.
- Comentarios: ticketId/usuarioId/contenido/tipoComentario; POST 201, GET 200, ticket inexistente 400. Historial GET 200, inexistente 404; sin escritura manual.
- Adjuntos: multipart archivo; POST/GET 200, inexistente 404. Metadatos sin rutaArchivo; descarga segura de carpetas Spring y anterior Nest, sin mover ni cambiar registros.
- Recursos: GET/PUT 200; proveedor/fechas/estadoRecurso y campos opcionales; transiciones, retraso y cierre del ticket conservados. Reportes agregados mantienen nombres del frontend.
- Configuración: veinte flags booleanos, PUT cuatro globales obligatorios; opcionales/null conservan existentes; auditoría ADMIN. Enlaces: correoDestinatario/fechaExpiracion?; POST 201; lectura/revocación 200; token inválido 404, expirado/revocado 403; público sin JWT y solo lectura.
- Pruebas específicas: administracion.e2e-spec.ts (los 24 endpoints antes ausentes, campos, null, roles, duplicados, rollback y concurrencia); identidad.e2e-spec.ts e identidad.spec.ts (guard real); paridad.rules.spec.ts y tickets.e2e-spec.ts (defaults y estado); actividad-tickets.e2e-spec.ts (rutas históricas autorizadas, traversal, descarga y ausencia de rutas sensibles). Las otras suites verifican los módulos ya migrados.

## Diferencias deliberadas no bloqueantes

- JWT: se consulta usuario/rol persistido; cuentas inactivas o sesiones con rol/identidad desactualizados reciben 401 y deben volver a iniciar sesión. Evita privilegios retirados. Claims y rol se normalizan; clave mínima 32 bytes.
- Se conservan los filtros de acceso más estrictos de comentarios/proyectos/reportes y los dos reportes adicionales.
- Validaciones de tipos/longitudes siguen siendo estrictas cuando no afectan payloads del frontend; BCrypt inmediato en altas/edición de usuarios en vez de guardar contraseñas sin hash.
- Long grandes se devuelven como cadenas sin pérdida de precisión. Errores inesperados 500 genéricos en vez de exponer excepciones internas; errores HTTP conocidos usan timestamp/status/error/message.
- Archivo inexistente 404; path traversal y escapes por enlaces bloqueados. Carpeta principal compartida uploads/adjuntos del proyecto Spring; lectura compatible de apps/api/uploads/adjuntos anterior. Ningún archivo o registro real se mueve.
- Astro debe usar proxy /api o el mismo origen y configurar FRONTEND_URL para la página pública; no se añade un origen CORS permisivo ni se modifica el frontend Spring.

No quedan rutas Spring o frontend ausentes. Pruebas con mocks/fixtures y SMTP simulado; no migraciones ni cambios permanentes en PostgreSQL.
