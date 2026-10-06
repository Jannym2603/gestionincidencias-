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
const roleRows = ['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].map((nombre, id) => ({ id: id + 1, nombre }));
const adminCompanies = [{ id: 1, nombre: 'Acme', descripcion: 'Compañía principal', estado: true, fechaCreacion: '2026-01-01' }, { id: 2, nombre: 'Otra', descripcion: null, estado: true, fechaCreacion: '2026-01-02' }];
const adminProjects = [{ id: 1, nombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', descripcion: 'Portal de clientes', estado: true, fechaCreacion: '2026-02-01' }, { id: 2, nombre: 'Privado', companiaId: 2, companiaNombre: 'Otra', descripcion: null, estado: true, fechaCreacion: '2026-02-02' }];
const userProjects = [{ id: 1, usuarioId: 2, proyectoId: 1, estado: true, fechaAsignacion: '2026-02-01' }, { id: 2, usuarioId: 3, proyectoId: 1, estado: true, fechaAsignacion: '2026-02-01' }, { id: 3, usuarioId: 4, proyectoId: 1, estado: true, fechaAsignacion: '2026-02-01' }];
let nextUserId = 5; let nextCompanyId = 3; let nextProjectId = 3; let nextAssignmentId = 4;
let nextShareId = 1;
const sharedLinks = [];
const featureFlags = Object.fromEntries(['crearTicketActivo', 'solicitudesRecursosActivo', 'reportesActivos', 'historialActivo', 'crearTicketCliente', 'crearTicketAgente', 'crearTicketSupervisor', 'crearTicketAdmin', 'solicitudesRecursosCliente', 'solicitudesRecursosAgente', 'solicitudesRecursosSupervisor', 'solicitudesRecursosAdmin', 'reportesCliente', 'reportesAgente', 'reportesSupervisor', 'reportesAdmin', 'historialCliente', 'historialAgente', 'historialSupervisor', 'historialAdmin'].map((field) => [field, true]));
const auditEntries = [];
const adminRole = (req) => ['ADMIN', 'SUPERVISOR'].includes(req.user.rol);
const safeUser = (u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono ?? null, estado: u.estado, rol: u.rol, fechaCreacion: u.fechaCreacion ?? '2026-10-06' });
const projectFor = (id) => adminProjects.find((p) => p.id === Number(id));
const companyFor = (id) => adminCompanies.find((c) => c.id === Number(id));
const canManageRole = (actor, target) => actor === 'ADMIN' || (actor === 'SUPERVISOR' && ['CLIENTE', 'AGENTE'].includes(target));
const canSeeProject = (req, id) => req.user.rol === 'ADMIN' || (req.user.rol === 'SUPERVISOR' && Number(id) === 1) || ['AGENTE', 'CLIENTE'].includes(req.user.rol) && userProjects.some((a) => a.usuarioId === req.user.usuarioId && a.proyectoId === Number(id) && a.estado);
const repo = { findUsuario: async (correo) => accounts.find((u) => u.correo === correo), findRol: async (id) => ({ rol: { nombre: accounts.find((u) => u.id === id)?.rol } }) };
const auth = new AuthService(jwt, repo, { enviar: async () => true });
const module = await Test.createTestingModule({ controllers: [AuthController], providers: [
    { provide: AuthService, useValue: auth }, { provide: JwtService, useValue: jwt }, JwtAuthGuard,
    { provide: IdentidadService, useValue: { resolver: async (claims) => claims } },
] }).compile();
const app = module.createNestApplication({ logger: false, bodyParser: false });
const express = app.getHttpAdapter().getInstance();
express.use(requireApi('express').json({ strict: false }));
express.get('/health', (_req, res) => res.json({ ok: true }));
express.use('/api', (req, res, next) => {
    if (req.path === '/auth/login') return next();
    if (req.path.startsWith('/public/compartidos/')) return next();
    try { req.user = jwt.verify(String(req.headers.authorization ?? '').replace(/^Bearer /, '')); next(); }
    catch { res.status(401).json({ message: 'Token inválido o expirado.' }); }
});
express.get('/api/usuarios/me', (req, res) => { const user = accounts.find((u) => u.id === req.user.usuarioId); res.json({ id: user.id, nombre: user.nombre, apellido: user.apellido, correo: user.correo, telefono: user.telefono ?? null, rol: user.rol }); });
express.get('/api/configuracion-sistema', (_req, res) => res.json(featureFlags));
express.put('/api/configuracion-sistema', requireApi('express').json(), (req, res) => {
    if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'Solo ADMIN puede cambiar la configuración.' });
    const body = req.body ?? {}; const required = ['crearTicketActivo', 'solicitudesRecursosActivo', 'reportesActivos', 'historialActivo'];
    if (required.some((field) => typeof body[field] !== 'boolean') || Object.entries(body).some(([field, value]) => Object.hasOwn(featureFlags, field) && typeof value !== 'boolean')) return res.status(400).json({ message: 'Las banderas deben ser booleanas e incluir los estados globales.' });
    for (const [field, value] of Object.entries(body)) {
        if (!Object.hasOwn(featureFlags, field) || featureFlags[field] === value) continue;
        const module = field.replace(/(Activo|Cliente|Agente|Supervisor|Admin)$/, '').toUpperCase();
        const role = field.endsWith('Activo') ? 'GLOBAL' : field.slice(module.length).toUpperCase();
        auditEntries.unshift({ id: auditEntries.length + 1, usuarioId: req.user.usuarioId, usuarioNombre: `Usuario ${req.user.rol}`, usuarioCorreo: req.user.sub, modulo: module, rol: role, valorAnterior: String(featureFlags[field]), valorNuevo: String(value), fechaCambio: new Date().toISOString() });
        featureFlags[field] = value;
    }
    res.json(featureFlags);
});
express.get('/api/configuracion-sistema/auditoria', (req, res) => req.user.rol === 'ADMIN' ? res.json(auditEntries) : res.status(403).json({ message: 'Solo ADMIN puede consultar la auditoría.' }));
express.get('/api/roles', (req, res) => adminRole(req) ? res.json(roleRows) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/usuarios', (req, res) => adminRole(req) ? res.json(accounts.map(safeUser)) : res.status(403).json({ message: 'No tienes permiso.' }));
express.post('/api/usuarios', requireApi('express').json(), async (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    const b = req.body ?? {}; const rol = String(b.rol ?? '').toUpperCase();
    if (!b.nombre?.trim() || !b.apellido?.trim() || !b.correo?.trim() || !['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(rol)) return res.status(400).json({ message: 'Completa nombre, apellido, correo y rol.' });
    if (!canManageRole(req.user.rol, rol)) return res.status(400).json({ message: 'El SUPERVISOR solo puede administrar usuarios CLIENTE y AGENTE.' });
    if (typeof b.password !== 'string' || b.password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    if (accounts.some((u) => u.correo.toLowerCase() === b.correo.toLowerCase())) return res.status(400).json({ message: 'Ya existe un usuario con ese correo.' });
    const user = { id: nextUserId++, nombre: b.nombre.trim(), apellido: b.apellido.trim(), correo: b.correo.trim().toLowerCase(), telefono: b.telefono || null, password: await bcrypt.hash(b.password, 10), estado: true, rol, fechaCreacion: '2026-10-06' };
    accounts.push(user); res.status(201).json(safeUser(user));
});
express.put('/api/usuarios/:id', requireApi('express').json(), (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    const user = accounts.find((u) => u.id === Number(req.params.id)); if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
    if (!canManageRole(req.user.rol, user.rol) || !canManageRole(req.user.rol, req.body?.rol)) return res.status(400).json({ message: 'El SUPERVISOR solo puede administrar usuarios CLIENTE y AGENTE.' });
    Object.assign(user, { nombre: req.body.nombre, apellido: req.body.apellido, correo: req.body.correo.toLowerCase(), telefono: req.body.telefono || null, rol: req.body.rol });
    if (req.body.password) user.password = req.body.password;
    res.json(safeUser(user));
});
express.put('/api/usuarios/:id/estado', requireApi('express').json(), (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    const user = accounts.find((u) => u.id === Number(req.params.id)); if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
    if (!canManageRole(req.user.rol, user.rol) || typeof req.body?.estado !== 'boolean' || (!req.body.estado && user.id === req.user.usuarioId)) return res.status(400).json({ message: 'No se puede cambiar el estado de este usuario.' });
    user.estado = req.body.estado; res.json(safeUser(user));
});
express.get('/api/companias/activas', (req, res) => adminRole(req) ? res.json(adminCompanies.filter((c) => c.estado)) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/companias', (req, res) => adminRole(req) ? res.json(adminCompanies) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/companias/:id', (req, res) => { if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' }); const company = companyFor(req.params.id); return company ? res.json(company) : res.status(400).json({ message: 'Compañía no encontrada.' }); });
express.post('/api/companias', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const b = req.body ?? {}; if (!b.nombre?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio.' }); if (adminCompanies.some((c) => c.nombre.toLowerCase() === b.nombre.trim().toLowerCase())) return res.status(400).json({ message: 'Ya existe una compañía con ese nombre.' }); const company = { id: nextCompanyId++, nombre: b.nombre.trim(), descripcion: b.descripcion || null, estado: b.estado ?? true, fechaCreacion: '2026-10-06' }; adminCompanies.push(company); res.status(201).json(company); });
express.put('/api/companias/:id', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const company = companyFor(req.params.id); if (!company) return res.status(400).json({ message: 'Compañía no encontrada.' }); Object.assign(company, req.body); res.json(company); });
express.put('/api/companias/:id/estado', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const company = companyFor(req.params.id); if (!company) return res.status(400).json({ message: 'Compañía no encontrada.' }); if (typeof req.body !== 'boolean') return res.status(400).json({ message: 'El estado debe ser booleano.' }); company.estado = req.body; res.json(company); });
express.get('/api/proyectos/activos', (req, res) => adminRole(req) ? res.json(adminProjects.filter((p) => p.estado)) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/proyectos/compania/:id/activos', (req, res) => adminRole(req) ? res.json(adminProjects.filter((p) => p.companiaId === Number(req.params.id) && p.estado)) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/proyectos/compania/:id', (req, res) => adminRole(req) ? res.json(adminProjects.filter((p) => p.companiaId === Number(req.params.id))) : res.status(403).json({ message: 'No tienes permiso.' }));
express.get('/api/proyectos', (req, res) => res.json(adminProjects.filter((p) => canSeeProject(req, p.id))));
express.get('/api/proyectos/:id', (req, res) => { const project = projectFor(req.params.id); if (!project) return res.status(400).json({ message: 'Proyecto no encontrado.' }); if (!canSeeProject(req, project.id)) return res.status(403).json({ message: 'No tienes acceso al proyecto.' }); res.json(project); });
express.post('/api/proyectos', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const b = req.body ?? {}; const company = companyFor(b.companiaId); if (!company?.estado) return res.status(400).json({ message: 'La compañía debe estar activa.' }); if (!b.nombre?.trim()) return res.status(400).json({ message: 'El nombre es obligatorio.' }); const project = { id: nextProjectId++, nombre: b.nombre.trim(), descripcion: b.descripcion || null, companiaId: company.id, companiaNombre: company.nombre, estado: b.estado ?? true, fechaCreacion: '2026-10-06' }; adminProjects.push(project); res.status(201).json(project); });
express.put('/api/proyectos/:id', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const project = projectFor(req.params.id); if (!project) return res.status(400).json({ message: 'Proyecto no encontrado.' }); const company = companyFor(req.body.companiaId); if (!company?.estado) return res.status(400).json({ message: 'La compañía debe estar activa.' }); Object.assign(project, req.body, { companiaNombre: company.nombre }); res.json(project); });
express.put('/api/proyectos/:id/estado', requireApi('express').json(), (req, res) => { if (req.user.rol !== 'ADMIN') return res.status(403).json({ message: 'No tienes permiso.' }); const project = projectFor(req.params.id); if (!project) return res.status(400).json({ message: 'Proyecto no encontrado.' }); if (typeof req.body !== 'boolean') return res.status(400).json({ message: 'El estado debe ser booleano.' }); if (req.body && !companyFor(project.companiaId)?.estado) return res.status(400).json({ message: 'No se puede activar el proyecto.' }); project.estado = req.body; res.json(project); });
express.get('/api/usuario-proyectos/usuario/:id/todas', (req, res) => { if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' }); const user = accounts.find((u) => u.id === Number(req.params.id)); if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' }); const rows = userProjects.filter((a) => a.usuarioId === user.id && (req.user.rol !== 'SUPERVISOR' || a.proyectoId === 1)).map((a) => ({ ...a, usuarioNombre: `${user.nombre} ${user.apellido}`, usuarioCorreo: user.correo, proyectoNombre: projectFor(a.proyectoId)?.nombre, companiaNombre: companyFor(projectFor(a.proyectoId)?.companiaId)?.nombre })); res.json(rows); });
express.get('/api/usuario-proyectos/proyecto/:id', (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    if (req.user.rol === 'SUPERVISOR' && Number(req.params.id) !== 1) return res.status(403).json({ message: 'No tienes acceso al proyecto.' });
    if (!projectFor(req.params.id)) return res.status(400).json({ message: 'Proyecto no encontrado.' });
    res.json(userProjects.filter((a) => a.proyectoId === Number(req.params.id) && a.estado).map((a) => { const user = accounts.find((u) => u.id === a.usuarioId); return { ...a, usuarioNombre: `${user?.nombre} ${user?.apellido}`, usuarioCorreo: user?.correo }; }));
});
express.post('/api/usuario-proyectos', requireApi('express').json(), (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    const user = accounts.find((u) => u.id === Number(req.body.usuarioId)); const project = projectFor(req.body.proyectoId);
    if (!user || !project) return res.status(400).json({ message: 'Usuario o proyecto no encontrado.' });
    if (req.user.rol === 'SUPERVISOR' && project.id !== 1) return res.status(403).json({ message: 'No tienes acceso al proyecto.' });
    if (!user.estado || !project.estado || !companyFor(project.companiaId)?.estado) return res.status(400).json({ message: 'El usuario, proyecto y compañía deben estar activos.' });
    let assignment = userProjects.find((a) => a.usuarioId === user.id && a.proyectoId === project.id);
    if (assignment?.estado) return res.status(400).json({ message: 'El usuario ya tiene acceso a este proyecto.' });
    if (assignment) { assignment.estado = true; } else { assignment = { id: nextAssignmentId++, usuarioId: user.id, proyectoId: project.id, estado: true, fechaAsignacion: '2026-10-06' }; userProjects.push(assignment); }
    res.status(201).json({ ...assignment, usuarioNombre: `${user.nombre} ${user.apellido}`, usuarioCorreo: user.correo });
});
express.put('/api/usuario-proyectos/:id/:action', (req, res) => {
    if (!adminRole(req)) return res.status(403).json({ message: 'No tienes permiso.' });
    const assignment = userProjects.find((a) => a.id === Number(req.params.id)); if (!assignment) return res.status(400).json({ message: 'Asignación no encontrada.' });
    if (req.user.rol === 'SUPERVISOR' && assignment.proyectoId !== 1) return res.status(403).json({ message: 'No tienes acceso al proyecto.' });
    const next = req.params.action === 'activar'; const user = accounts.find((u) => u.id === assignment.usuarioId); const project = projectFor(assignment.proyectoId);
    if (assignment.estado === next) return res.status(400).json({ message: 'El estado de la asignación ya coincide.' });
    if (next && (!user?.estado || !project?.estado || !companyFor(project.companiaId)?.estado)) return res.status(400).json({ message: 'El usuario, proyecto y compañía deben estar activos.' });
    assignment.estado = next; res.json(assignment);
});
express.get('/api/tipos-incidencia', (_req, res) => res.json([{ id: 8, nombre: 'Red', estado: true }, { id: 9, nombre: 'Acceso', estado: true }]));
express.get('/api/usuario-proyectos/usuario/:id', (req, res) => { if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No tienes permiso.' }); if (req.user.rol === 'SUPERVISOR' && Number(req.params.id) !== 4) return res.status(403).json({ message: 'No tienes acceso.' }); res.json(Number(req.params.id) === 4 ? [{ usuarioId: 4, proyectoId: 1, estado: true, companiaId: 1 }] : []); });
express.get('/api/usuario-proyectos/mis-proyectos', (req, res) => res.json(userProjects.filter((a) => a.usuarioId === req.user.usuarioId && a.estado).map((a) => ({ ...a, proyectoNombre: projectFor(a.proyectoId)?.nombre, companiaId: projectFor(a.proyectoId)?.companiaId, companiaNombre: companyFor(projectFor(a.proyectoId)?.companiaId)?.nombre }))));
express.get('/api/usuario-proyectos/proyecto/:id', (req, res) => {
    if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No tienes permiso.' });
    if (req.user.rol === 'SUPERVISOR' && Number(req.params.id) !== 1) return res.status(403).json({ message: 'No tienes acceso al proyecto.' });
    res.json(Number(req.params.id) === 1 ? [{ id: 1, usuarioId: 3, usuarioNombre: 'Usuario AGENTE', estado: true, proyectoId: 1 }] : []);
});
const reportTickets = (req) => tickets.filter((t) => allowed(t, req.user) && (!req.query.proyectoId || t.proyectoId === Number(req.query.proyectoId)) && (!req.query.companiaId || t.companiaId === Number(req.query.companiaId)));
const reportAllowed = (req) => req.user.rol === 'ADMIN' ? featureFlags.reportesActivos : featureFlags.reportesActivos && featureFlags[`reportes${req.user.rol[0]}${req.user.rol.slice(1).toLowerCase()}`];
const reportGuard = (req, res) => { if (!reportAllowed(req)) { res.status(403).json({ message: 'No tienes acceso a los reportes.' }); return false; } return true; };
const countValues = (rows, values, field) => values.map((nombre) => ({ nombre, total: rows.filter((t) => String(t[field] ?? '').toUpperCase() === nombre).length }));
const operation = (rows) => { const op = rows.filter((t) => t.tipoAtencion !== 'RECURSO_EXTERNO'); const count = (state) => op.filter((t) => t.estado === state).length; return { totalOperativos: op.length, ticketsNuevos: count('NUEVO'), ticketsAsignados: count('ASIGNADO'), ticketsEnProgreso: count('EN_PROGRESO'), ticketsResueltos: count('RESUELTO'), ticketsCerrados: count('CERRADO') }; };
express.get('/api/reportes/resumen', (req, res) => { if (!reportGuard(req, res)) return; const rows = reportTickets(req); return res.json({ totalTickets: rows.length, ticketsNuevos: rows.filter((t) => t.estado === 'NUEVO').length, ticketsAsignados: rows.filter((t) => t.estado === 'ASIGNADO').length, ticketsEnProgreso: rows.filter((t) => t.estado === 'EN_PROGRESO').length, ticketsResueltos: rows.filter((t) => t.estado === 'RESUELTO').length, ticketsCerrados: rows.filter((t) => t.estado === 'CERRADO').length, totalUsuarios: new Set(rows.flatMap((t) => [t.clienteId, t.agenteId].filter(Boolean))).size, totalComentarios: comments.filter((c) => rows.some((t) => t.id === c.ticketId) && (req.user.rol !== 'CLIENTE' || c.tipoComentario !== 'INTERNO')).length }); });
express.get('/api/reportes/operacion-resumen', (req, res) => {
    if (!reportGuard(req, res)) return;
    if (Object.hasOwn(req.query, 'companiaId') || Object.hasOwn(req.query, 'proyectoId')) return res.json(operation(reportTickets(req)));
    return res.json({ totalOperativos: 1, ticketsNuevos: 1, ticketsAsignados: 0, ticketsEnProgreso: 0, ticketsResueltos: 0, ticketsCerrados: 0 });
});
express.get('/api/reportes/tickets-por-estado', (req, res) => reportGuard(req, res) ? res.json(countValues(reportTickets(req).filter((t) => t.tipoAtencion !== 'RECURSO_EXTERNO'), ['NUEVO', 'ASIGNADO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'], 'estado')) : null);
express.get('/api/reportes/tickets-por-prioridad', (req, res) => reportGuard(req, res) ? res.json(countValues(reportTickets(req).filter((t) => t.tipoAtencion !== 'RECURSO_EXTERNO'), ['P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAJA'], 'prioridad')) : null);
express.get('/api/reportes/tickets-por-tipo', (req, res) => { if (!reportGuard(req, res)) return; const counts = new Map(); for (const t of reportTickets(req).filter((row) => row.tipoAtencion !== 'RECURSO_EXTERNO')) counts.set(t.tipoIncidenciaNombre, (counts.get(t.tipoIncidenciaNombre) ?? 0) + 1); res.json([...counts].map(([nombre, total]) => ({ nombre, total }))); });
express.get('/api/reportes/dashboard-resumen', (req, res) => { if (!reportGuard(req, res)) return; res.json({ totalUsuarios: 4, totalComentarios: 2 }); });
express.get('/api/reportes/recursos-resumen', (req, res) => reportGuard(req, res) ? res.json({ totalSolicitudes: 1, nuevas: 0, enValidacion: 0, solicitadasProveedor: 0, esperandoProveedor: 1, recibidas: 0, entregadas: 0, cerradas: 0, canceladas: 0, proximasEntregas: 1, retrasadas: 0, promedioDiasProveedor: 0 }) : null);
const fixtureResources = [{ id: 1, ticketId: 101, numeroTicket: 'INC-2026-0101', tituloTicket: 'Acceso externo', clienteId: 4, clienteNombre: 'Usuario CLIENTE', companiaId: 1, companiaNombre: 'Acme', proyectoId: 1, proyectoNombre: 'Portal', categoria: 'OTRO', recurso: 'Llave de acceso', cantidad: 1, proveedor: 'Proveedor de prueba', estadoRecurso: 'ESPERANDO_PROVEEDOR', fechaEstimadaEntrega: '2026-10-12T10:00:00', situacionEntrega: 'EN_TIEMPO', retrasada: false, diasRetraso: 0 }];
express.get('/api/solicitudes-recursos', (req, res) => res.json(fixtureResources.filter((resource) => { const ticket = tickets.find((item) => item.id === resource.ticketId); return ticket && allowed(ticket, req.user); })));
express.get('/api/solicitudes-recursos/ticket/:id', (req, res) => {
    if (Number(req.params.id) === 101 && tickets[1] && allowed(tickets[1], req.user)) return res.json(fixtureResources.filter((resource) => resource.ticketId === Number(req.params.id)));
    res.json([]);
});
express.put('/api/solicitudes-recursos/:id', requireApi('express').json(), (req, res) => {
    if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'No puedes gestionar recursos.' });
    const resource = fixtureResources.find((item) => item.id === Number(req.params.id));
    if (!resource) return res.status(404).json({ message: 'Recurso no encontrado.' });
    Object.assign(resource, req.body);
    return res.json(resource);
});
const tickets = [
    { id: 100, numeroTicket: 'INC-2026-0100', titulo: 'Revisar red', descripcion: 'Sin conectividad', tipoIncidenciaId: 8, tipoIncidenciaNombre: 'Red', clienteId: 4, clienteNombre: 'Usuario CLIENTE', agenteId: 3, agenteNombre: 'Usuario AGENTE', proyectoId: 1, proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: 'OPERATIVO', estado: 'NUEVO', prioridad: 'P2_ALTA', fechaCreacion: '2026-10-05T10:00:00', fechaActualizacion: '2026-10-06T10:00:00', fechaCierre: null, fechaLimiteRespuesta: '2026-10-06T12:00:00', fechaPrimeraRespuesta: null, slaRespuestaCumplido: null, fechaLimiteResolucion: '2026-10-08T10:00:00', slaResolucionCumplido: null },
    { id: 101, numeroTicket: 'INC-2026-0101', titulo: 'Acceso externo', descripcion: 'Proveedor requerido', tipoIncidenciaId: 9, tipoIncidenciaNombre: 'Acceso', clienteId: 4, clienteNombre: 'Usuario CLIENTE', agenteId: null, agenteNombre: null, proyectoId: 1, proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: 'RECURSO_EXTERNO', estado: 'EN_PROGRESO', prioridad: 'P3_MEDIA', fechaCreacion: '2026-10-04T10:00:00', fechaActualizacion: '2026-10-06T10:00:00', fechaCierre: null, fechaLimiteRespuesta: '2026-10-05T10:00:00', fechaPrimeraRespuesta: '2026-10-04T11:00:00', slaRespuestaCumplido: true, fechaLimiteResolucion: null, slaResolucionCumplido: null },
    { id: 200, numeroTicket: 'INC-2026-0200', titulo: 'Otro proyecto', descripcion: 'Privado', tipoIncidenciaId: 8, tipoIncidenciaNombre: 'Red', clienteId: 2, clienteNombre: 'Otra persona', agenteId: 2, agenteNombre: 'Otro agente', proyectoId: 2, proyectoNombre: 'Privado', companiaId: 2, companiaNombre: 'Otra compañía', tipoAtencion: 'OPERATIVO', estado: 'CERRADO', prioridad: 'P1_CRITICA', fechaCreacion: '2026-10-01T10:00:00' },
];
const createdTickets = [];
const allowed = (ticket, user) => user.rol === 'ADMIN' || (user.rol === 'SUPERVISOR' && ticket.proyectoId === 1) || (user.rol === 'AGENTE' && ticket.agenteId === user.usuarioId) || (user.rol === 'CLIENTE' && ticket.clienteId === user.usuarioId);
const comments = [{ id: 1, ticketId: 100, nombreUsuario: 'Usuario AGENTE', contenido: 'Comentario público', tipoComentario: 'PUBLICO', fechaCreacion: '2026-10-05T11:00:00' }, { id: 2, ticketId: 100, nombreUsuario: 'Usuario ADMIN', contenido: 'Nota interna', tipoComentario: 'INTERNO', fechaCreacion: '2026-10-05T12:00:00' }];
const history = [{ id: 1, ticketId: 100, usuarioId: 4, nombreUsuario: 'Usuario CLIENTE', accion: 'CREADO', descripcion: 'Ticket creado', fechaCreacion: '2026-10-05T10:00:00' }, { id: 2, ticketId: 100, usuarioId: 1, nombreUsuario: 'Usuario ADMIN', accion: 'CAMBIO_PRIORIDAD', descripcion: 'Prioridad actualizada', fechaCreacion: '2026-10-06T09:00:00' }];
const attachments = [{ id: 5, ticketId: 100, nombreArchivo: 'evidencia.txt', tipoArchivo: 'text/plain', tamanio: 2048, fechaSubida: '2026-10-05T11:00:00' }];
sharedLinks.push({ id: nextShareId++, ticketId: 100, numeroTicket: tickets[0].numeroTicket, correoDestinatario: 'expired@fixture.invalid', token: 'fixture-expired-token', enlace: 'http://localhost:8081/ticket-compartido.html?token=fixture-expired-token', fechaCreacion: '2026-10-01T10:00:00Z', fechaExpiracion: '2026-10-02T10:00:00Z', activo: true, ticket: tickets[0] }, { id: nextShareId++, ticketId: 100, numeroTicket: tickets[0].numeroTicket, correoDestinatario: 'revoked@fixture.invalid', token: 'fixture-revoked-token', enlace: 'http://localhost:8081/ticket-compartido.html?token=fixture-revoked-token', fechaCreacion: '2026-10-01T10:00:00Z', fechaExpiracion: '2026-10-30T10:00:00Z', activo: false, ticket: tickets[0] });
function ticketFor(req, res, id) { const ticket = tickets.find((t) => t.id === Number(id)) ?? createdTickets.find((t) => t.id === Number(id)); if (!ticket) { res.status(400).json({ status: 400, message: 'Ticket no encontrado.' }); return null; } if (!allowed(ticket, req.user)) { res.status(403).json({ status: 403, message: 'No tienes acceso a este ticket.' }); return null; } return ticket; }
express.get('/api/tickets', (req, res) => res.json(tickets.filter((t) => allowed(t, req.user))));
express.get('/api/tickets/:id', (req, res) => { const t = ticketFor(req, res, req.params.id); if (t) res.json(t); });
const shareDTO = (link) => ({ ...link, puedeVer: true, puedeComentar: false, puedeVerAdjuntos: false, puedeSubirAdjuntos: false, puedeCambiarEstado: false });
express.get('/api/tickets/:id/enlaces-compartidos', (req, res) => { if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'Tu rol no puede compartir tickets.' }); if (!ticketFor(req, res, req.params.id)) return; res.json(sharedLinks.filter((link) => link.ticketId === Number(req.params.id)).map(shareDTO)); });
express.post('/api/tickets/:id/compartir', requireApi('express').json(), (req, res) => {
    if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'Tu rol no puede compartir tickets.' });
    const ticket = ticketFor(req, res, req.params.id); if (!ticket) return;
    const email = String(req.body?.correoDestinatario ?? '').trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'El correo del destinatario no es válido.' });
    const expiration = req.body?.fechaExpiracion ? new Date(req.body.fechaExpiracion) : new Date(Date.now() + 7 * 86400000);
    if (!Number.isFinite(expiration.getTime()) || expiration <= new Date() || expiration > new Date(Date.now() + 30 * 86400000)) return res.status(400).json({ message: 'La expiración debe ser posterior y no superar 30 días.' });
    const token = `fixture-share-${randomBytes(16).toString('hex')}`; const link = { id: nextShareId++, ticketId: ticket.id, numeroTicket: ticket.numeroTicket, correoDestinatario: email, token, enlace: `http://localhost:8081/ticket-compartido.html?token=${encodeURIComponent(token)}`, fechaCreacion: new Date().toISOString(), fechaExpiracion: expiration.toISOString(), activo: true, ticket };
    sharedLinks.push(link); res.status(201).json(shareDTO(link));
});
express.delete('/api/tickets/enlaces-compartidos/:id', (req, res) => { if (!['ADMIN', 'SUPERVISOR'].includes(req.user.rol)) return res.status(403).json({ message: 'Tu rol no puede compartir tickets.' }); const link = sharedLinks.find((entry) => entry.id === Number(req.params.id)); if (!link) return res.status(404).json({ message: 'No se encontró el enlace compartido.' }); if (!ticketFor(req, res, link.ticketId)) return; link.activo = false; res.json(shareDTO(link)); });
express.get('/api/public/compartidos/:token', (req, res) => {
    const link = sharedLinks.find((entry) => entry.token === req.params.token); if (!link) return res.status(404).json({ message: 'El enlace no existe.' });
    if (!link.activo) return res.status(403).json({ message: 'El enlace fue desactivado.' }); if (new Date(link.fechaExpiracion) <= new Date()) return res.status(403).json({ message: 'El enlace ha expirado.' });
    const { ticket } = link; return res.json({ ticketId: ticket.id, numeroTicket: ticket.numeroTicket, titulo: ticket.titulo, descripcion: ticket.descripcion, estado: ticket.estado, prioridad: ticket.prioridad, categoria: ticket.tipoIncidenciaNombre, nombreCliente: ticket.clienteNombre, nombreAgente: ticket.agenteNombre || 'Sin asignar', fechaCreacion: ticket.fechaCreacion, fechaExpiracion: link.fechaExpiracion, puedeVer: true, puedeComentar: false, puedeVerAdjuntos: false, puedeSubirAdjuntos: false, puedeCambiarEstado: false, correoInterno: 'private@fixture.invalid', token: link.token, passwordHash: 'never-return-this' });
});
express.post('/api/tickets', requireApi('express').json(), (req, res) => {
    const b = req.body;
    if (!b.titulo || !b.descripcion || !b.tipoIncidenciaId || !b.clienteId || !b.proyectoId || !b.impacto || !b.urgencia) return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    if (req.user.rol === 'CLIENTE' && Number(b.clienteId) !== req.user.usuarioId) return res.status(403).json({ message: 'Solo puedes crear tickets propios.' });
    if (!(req.user.rol === 'ADMIN' || (Number(b.proyectoId) === 1 && ['SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(req.user.rol)))) return res.status(403).json({ message: 'No tienes acceso al proyecto seleccionado.' });
    if (b.tipoAtencion === 'RECURSO_EXTERNO' && (!b.solicitudRecurso?.categoria || !b.solicitudRecurso?.recurso || Number(b.solicitudRecurso?.cantidad) < 1)) return res.status(400).json({ message: 'Solicitud de recurso invalida.' });
    const id = Math.max(...tickets.concat(createdTickets).map((t) => t.id)) + 1;
    const ticket = { id, numeroTicket: `INC-2026-${String(id).padStart(4, '0')}`, titulo: b.titulo, descripcion: b.descripcion, tipoIncidenciaId: Number(b.tipoIncidenciaId), tipoIncidenciaNombre: 'Red', clienteId: Number(b.clienteId), clienteNombre: 'Usuario CLIENTE', agenteId: null, agenteNombre: null, proyectoId: Number(b.proyectoId), proyectoNombre: 'Portal', companiaId: 1, companiaNombre: 'Acme', tipoAtencion: b.tipoAtencion || 'OPERATIVO', estado: 'NUEVO', prioridad: 'P3_MEDIA', fechaCreacion: new Date().toISOString() };
    createdTickets.push(ticket);
    history.push({ id: history.length + 1, ticketId: ticket.id, usuarioId: req.user.usuarioId, nombreUsuario: `Usuario ${req.user.rol}`, accion: 'CREADO', descripcion: 'Ticket creado.', fechaCreacion: ticket.fechaCreacion });
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
