// Nest real para login/JWT/BCrypt; persistencia y métricas exclusivamente en memoria.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
const requireApi = createRequire(new URL('../../api/package.json', import.meta.url));
process.env.DATABASE_URL = 'postgresql://fixture:fixture@127.0.0.1:1/never_connect';
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.MAIL_USERNAME = ''; process.env.MAIL_PASSWORD = '';
requireApi('reflect-metadata');
const { Test } = requireApi('@nestjs/testing');
const { JwtService } = requireApi('@nestjs/jwt');
const bcrypt = requireApi('bcrypt');
const { AuthController } = await import('../../api/dist/auth/auth.controller.js');
const { AuthService } = await import('../../api/dist/auth/auth.service.js');
const { JwtAuthGuard } = await import('../../api/dist/security/jwt-auth.guard.js');
const { IdentidadService } = await import('../../api/dist/security/identidad.service.js');
const jwt = new JwtService({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '1h' } });
const password = await bcrypt.hash('fixture-password', 10);
const accounts = ['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].map((rol, i) => ({ id: i + 1, nombre: 'Usuario', apellido: rol, correo: `${rol.toLowerCase()}@fixture.invalid`, password, estado: true, rol }));
const repo = { findUsuario: async (correo) => accounts.find((u) => u.correo === correo), findRol: async (id) => ({ rol: { nombre: accounts.find((u) => u.id === id)?.rol } }) };
const auth = new AuthService(jwt, repo, { enviar: async () => true });
const module = await Test.createTestingModule({ controllers: [AuthController], providers: [
    { provide: AuthService, useValue: auth }, { provide: JwtService, useValue: jwt }, JwtAuthGuard,
    { provide: IdentidadService, useValue: { resolver: async (claims) => claims } },
] }).compile();
const app = module.createNestApplication({ logger: false });
const express = app.getHttpAdapter().getInstance();
express.get('/health', (_req, res) => res.json({ ok: true }));
express.use('/api', (req, res, next) => {
    if (req.path === '/auth/login') return next();
    try { req.user = jwt.verify(String(req.headers.authorization ?? '').replace(/^Bearer /, '')); next(); }
    catch { res.status(401).json({ message: 'Token inválido o expirado.' }); }
});
express.get('/api/usuarios/me', (req, res) => { const user = accounts.find((u) => u.id === req.user.usuarioId); res.json({ id: user.id, nombre: user.nombre, apellido: user.apellido, rol: user.rol }); });
express.get('/api/configuracion-sistema', (_req, res) => res.json({ reportesActivos: true, solicitudesRecursosActivo: true }));
express.get('/api/proyectos', (req, res) => res.json(req.user.rol === 'ADMIN' ? [{ id: 1, nombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', estado: true }, { id: 2, nombre: 'Privado', companiaId: 2, companiaNombre: 'Otra', estado: true }] : ['SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(req.user.rol) ? [{ id: 1, nombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', estado: true }] : []));
express.get('/api/tipos-incidencia', (_req, res) => res.json([{ id: 8, nombre: 'Red', estado: true }, { id: 9, nombre: 'Acceso', estado: true }]));
express.get('/api/usuarios', (_req, res) => res.json(accounts.map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, rol: u.rol, estado: u.estado }))));
express.get('/api/usuario-proyectos/usuario/:id', (req, res) => { if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No tienes permiso.' }); if (req.user.rol === 'SUPERVISOR' && Number(req.params.id) !== 4) return res.status(403).json({ message: 'No tienes acceso.' }); res.json(Number(req.params.id) === 4 ? [{ usuarioId: 4, proyectoId: 1, estado: true, companiaId: 1 }] : []); });
express.get('/api/usuario-proyectos/proyecto/:id', (req, res) => {
    if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No tienes permiso.' });
    if (req.user.rol === 'SUPERVISOR' && Number(req.params.id) !== 1) return res.status(403).json({ message: 'No tienes acceso al proyecto.' });
    res.json(Number(req.params.id) === 1 ? [{ id: 1, usuarioId: 3, usuarioNombre: 'Usuario AGENTE', estado: true, proyectoId: 1 }] : []);
});
express.get('/api/reportes/operacion-resumen', (_req, res) => res.json({ totalOperativos: 1, ticketsNuevos: 1, ticketsAsignados: 0, ticketsEnProgreso: 0, ticketsResueltos: 0, ticketsCerrados: 0 }));
express.get('/api/reportes/dashboard-resumen', (_req, res) => res.json({ totalUsuarios: 4, totalComentarios: 2 }));
express.get('/api/reportes/recursos-resumen', (_req, res) => res.json({ totalSolicitudes: 0, esperandoProveedor: 0, proximasEntregas: 0, retrasadas: 0, entregadas: 0 }));
express.get('/api/solicitudes-recursos/ticket/:id', (req, res) => {
    if (Number(req.params.id) === 101 && tickets[1] && allowed(tickets[1], req.user)) return res.json([{ id: 1, ticketId: 101, recurso: 'Llave de acceso', proveedor: 'Proveedor de prueba', estadoRecurso: 'ESPERANDO_PROVEEDOR', fechaEstimadaEntrega: '2026-10-12T10:00:00', situacionEntrega: 'EN_TIEMPO' }]);
    res.json([]);
});
const tickets = [
    { id: 100, numeroTicket: 'INC-2026-0100', titulo: 'Revisar red', descripcion: 'Sin conectividad', tipoIncidenciaId: 8, tipoIncidenciaNombre: 'Red', clienteId: 4, clienteNombre: 'Usuario CLIENTE', agenteId: 3, agenteNombre: 'Usuario AGENTE', proyectoId: 1, proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: 'OPERATIVO', estado: 'NUEVO', prioridad: 'P2_ALTA', fechaCreacion: '2026-10-05T10:00:00', fechaActualizacion: '2026-10-06T10:00:00', fechaCierre: null, fechaLimiteRespuesta: '2026-10-06T12:00:00', fechaPrimeraRespuesta: null, slaRespuestaCumplido: null, fechaLimiteResolucion: '2026-10-08T10:00:00', slaResolucionCumplido: null },
    { id: 101, numeroTicket: 'INC-2026-0101', titulo: 'Acceso externo', descripcion: 'Proveedor requerido', tipoIncidenciaId: 9, tipoIncidenciaNombre: 'Acceso', clienteId: 4, clienteNombre: 'Usuario CLIENTE', agenteId: null, agenteNombre: null, proyectoId: 1, proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: 'RECURSO_EXTERNO', estado: 'EN_PROGRESO', prioridad: 'P3_MEDIA', fechaCreacion: '2026-10-04T10:00:00', fechaActualizacion: '2026-10-06T10:00:00', fechaCierre: null, fechaLimiteRespuesta: '2026-10-05T10:00:00', fechaPrimeraRespuesta: '2026-10-04T11:00:00', slaRespuestaCumplido: true, fechaLimiteResolucion: null, slaResolucionCumplido: null },
    { id: 200, numeroTicket: 'INC-2026-0200', titulo: 'Otro proyecto', descripcion: 'Privado', tipoIncidenciaId: 8, tipoIncidenciaNombre: 'Red', clienteId: 2, clienteNombre: 'Otra persona', agenteId: 2, agenteNombre: 'Otro agente', proyectoId: 2, proyectoNombre: 'Privado', companiaId: 2, companiaNombre: 'Otra compañía', tipoAtencion: 'OPERATIVO', estado: 'CERRADO', prioridad: 'P1_CRITICA', fechaCreacion: '2026-10-01T10:00:00' },
];
const allowed = (ticket, user) => user.rol === 'ADMIN' || (user.rol === 'SUPERVISOR' && ticket.proyectoId === 1) || (user.rol === 'AGENTE' && ticket.agenteId === user.usuarioId) || (user.rol === 'CLIENTE' && ticket.clienteId === user.usuarioId);
const comments = [{ id: 1, ticketId: 100, nombreUsuario: 'Usuario AGENTE', contenido: 'Comentario público', tipoComentario: 'PUBLICO', fechaCreacion: '2026-10-05T11:00:00' }, { id: 2, ticketId: 100, nombreUsuario: 'Usuario ADMIN', contenido: 'Nota interna', tipoComentario: 'INTERNO', fechaCreacion: '2026-10-05T12:00:00' }];
const history = [{ id: 1, ticketId: 100, usuarioId: 4, nombreUsuario: 'Usuario CLIENTE', accion: 'CREADO', descripcion: 'Ticket creado', fechaCreacion: '2026-10-05T10:00:00' }, { id: 2, ticketId: 100, usuarioId: 1, nombreUsuario: 'Usuario ADMIN', accion: 'CAMBIO_PRIORIDAD', descripcion: 'Prioridad actualizada', fechaCreacion: '2026-10-06T09:00:00' }];
const attachments = [{ id: 5, ticketId: 100, nombreArchivo: 'evidencia.txt', tipoArchivo: 'text/plain', tamanio: 2048, fechaSubida: '2026-10-05T11:00:00' }];
function ticketFor(req, res, id) { const ticket = tickets.find((t) => t.id === Number(id)); if (!ticket) { res.status(400).json({ status: 400, message: 'Ticket no encontrado.' }); return null; } if (!allowed(ticket, req.user)) { res.status(403).json({ status: 403, message: 'No tienes acceso a este ticket.' }); return null; } return ticket; }
express.get('/api/tickets', (req, res) => res.json(tickets.filter((t) => allowed(t, req.user))));
express.get('/api/tickets/:id', (req, res) => { const t = ticketFor(req, res, req.params.id); if (t) res.json(t); });
express.post('/api/tickets', requireApi('express').json(), (req, res) => {
    const b = req.body;
    if (!b.titulo || !b.descripcion || !b.tipoIncidenciaId || !b.clienteId || !b.proyectoId || !b.impacto || !b.urgencia) return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    if (req.user.rol === 'CLIENTE' && Number(b.clienteId) !== req.user.usuarioId) return res.status(403).json({ message: 'Solo puedes crear tickets propios.' });
    if (!(req.user.rol === 'ADMIN' || (Number(b.proyectoId) === 1 && ['SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(req.user.rol)))) return res.status(403).json({ message: 'No tienes acceso al proyecto seleccionado.' });
    if (b.tipoAtencion === 'RECURSO_EXTERNO' && (!b.solicitudRecurso?.categoria || !b.solicitudRecurso?.recurso || Number(b.solicitudRecurso?.cantidad) < 1)) return res.status(400).json({ message: 'Solicitud de recurso invalida.' });
    const id = Math.max(...tickets.map((t) => t.id)) + 1;
    const ticket = { id, numeroTicket: `INC-2026-${String(id).padStart(4, '0')}`, titulo: b.titulo, descripcion: b.descripcion, tipoIncidenciaId: Number(b.tipoIncidenciaId), tipoIncidenciaNombre: 'Red', clienteId: Number(b.clienteId), clienteNombre: 'Usuario CLIENTE', agenteId: null, agenteNombre: null, proyectoId: Number(b.proyectoId), proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: b.tipoAtencion || 'OPERATIVO', estado: 'NUEVO', prioridad: 'P3_MEDIA', fechaCreacion: new Date().toISOString() };
    res.status(201).json(ticket);
});
express.put('/api/tickets/:id/asignar', requireApi('express').json(), (req, res) => { const t = ticketFor(req, res, req.params.id); if (!t) return; if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No puedes asignar.' }); if (Number(req.body.agenteId) !== 3 || Number(t.proyectoId) !== 1) return res.status(400).json({ message: 'El agente no tiene acceso al proyecto.' }); t.agenteId = 3; t.agenteNombre = 'Usuario AGENTE'; if (t.estado === 'NUEVO') t.estado = 'EN_PROGRESO'; res.json(t); });
express.put('/api/tickets/:id/estado', requireApi('express').json(), (req, res) => { const t = ticketFor(req, res, req.params.id); if (!t) return; if (!['ADMIN', 'SUPERVISOR', 'AGENTE'].includes(req.user.rol)) return res.status(403).json({ message: 'No puedes cambiar el estado.' }); const transitions = { NUEVO: t.agenteId ? ['EN_PROGRESO'] : [], ASIGNADO: ['EN_PROGRESO'], EN_PROGRESO: ['CERRADO'], RESUELTO: ['CERRADO'], CERRADO: [] }; if (!(transitions[t.estado] || []).includes(req.body.estado)) return res.status(400).json({ message: 'Transicion no permitida.' }); if (req.body.estado === 'CERRADO' && !req.body.notaResolucion) return res.status(400).json({ message: 'Debes agregar una nota de cierre.' }); t.estado = req.body.estado; if (t.estado === 'CERRADO') t.fechaCierre = new Date().toISOString(); res.json(t); });
express.put('/api/tickets/:id/prioridad', requireApi('express').json(), (req, res) => { const t = ticketFor(req, res, req.params.id); if (!t) return; if (!['ADMIN', 'SUPERVISOR', 'AGENTE'].includes(req.user.rol)) return res.status(403).json({ message: 'No puedes cambiar la prioridad.' }); if (!['P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAJA'].includes(req.body.prioridad) || Number(req.body.usuarioId) !== req.user.usuarioId) return res.status(400).json({ message: 'Prioridad no valida.' }); t.prioridad = req.body.prioridad; res.json(t); });
express.get('/api/comentarios/ticket/:id', (req, res) => { if (!ticketFor(req, res, req.params.id)) return; res.json(comments.filter((c) => c.ticketId === Number(req.params.id) && (req.user.rol !== 'CLIENTE' || c.tipoComentario === 'PUBLICO'))); });
express.post('/api/comentarios', requireApi('express').json(), (req, res) => { const t = ticketFor(req, res, req.body.ticketId); if (!t) return; if (Number(req.body.usuarioId) !== req.user.usuarioId || (req.user.rol === 'CLIENTE' && req.body.tipoComentario !== 'PUBLICO')) return res.status(403).json({ status: 403, message: 'No puedes crear este comentario.' }); const c = { id: comments.length + 1, ticketId: t.id, nombreUsuario: `${accounts[req.user.usuarioId - 1].nombre} ${accounts[req.user.usuarioId - 1].rol}`, contenido: req.body.contenido, tipoComentario: req.body.tipoComentario, fechaCreacion: new Date().toISOString() }; comments.push(c); res.status(201).json(c); });
express.get('/api/historial-tickets/ticket/:id', (req, res) => { if (!ticketFor(req, res, req.params.id)) return; res.json(history.filter((h) => h.ticketId === Number(req.params.id) && (req.user.rol !== 'CLIENTE' || h.usuarioId === req.user.usuarioId)).sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))); });
const multer = requireApi('multer');
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
express.get('/api/adjuntos/ticket/:id', (req, res) => { if (!ticketFor(req, res, req.params.id)) return; res.json(attachments.filter((a) => a.ticketId === Number(req.params.id))); });
express.post('/api/adjuntos/ticket/:id', memoryUpload.single('archivo'), (req, res) => { if (!ticketFor(req, res, req.params.id)) return; if (!req.file) return res.status(400).json({ status: 400, message: 'Debes seleccionar un archivo.' }); if (!/\.(pdf|doc|docx|png|jpe?g|txt|xlsx?)$/i.test(req.file.originalname)) return res.status(400).json({ status: 400, message: 'Tipo de archivo no permitido.' }); const file = { id: attachments.length + 10, ticketId: Number(req.params.id), nombreArchivo: req.file.originalname, tipoArchivo: req.file.mimetype, tamanio: req.file.size, fechaSubida: new Date().toISOString() }; attachments.push(file); res.status(200).json(file); });
express.get('/api/adjuntos/:id/descargar', (req, res) => { const f = attachments.find((a) => a.id === Number(req.params.id)); if (!f) return res.status(404).json({ status: 404, message: 'Adjunto no encontrado.' }); if (!ticketFor(req, res, f.ticketId)) return; res.type(f.tipoArchivo).attachment(f.nombreArchivo).send(Buffer.from('fixture-adjunto')); });
await app.listen(4310, '127.0.0.1');
const close = async () => { await app.close(); process.exit(0); };
process.once('SIGTERM', close); process.once('SIGINT', close);
