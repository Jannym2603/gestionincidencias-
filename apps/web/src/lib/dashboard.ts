import { api, ApiError } from './http';
import { getSession, loginRedirect, expiry } from './session';
import { visible, featureAllowed, type Flags } from './navigation';
import { initializeSidebarToggle } from './sidebar-toggle';
interface Ticket { id: number; numeroTicket?: string | null; titulo: string; tipoAtencion?: string | null; tipoIncidenciaNombre?: string | null; clienteNombre?: string | null; clienteId: number; agenteId?: number | null; estado: string; prioridad: string; fechaCreacion?: string | null }
type Counts = Record<string, number>;
interface Resource { estadoRecurso: string; retrasada: boolean; fechaEstimadaEntrega?: string | null }
async function resourceSummary(): Promise<Counts> {
    try { return await api<Counts>('reportes/recursos-resumen'); }
    catch (e) {
        if (!(e instanceof ApiError && e.status === 403)) throw e;
        // Recursos conserva su propio permiso aunque Reportes esté desactivado.
        const rows = await api<Resource[]>('solicitudes-recursos');
        const now = Date.now(); const limit = now + 7 * 86400000;
        return { totalSolicitudes: rows.length, esperandoProveedor: rows.filter((s) => s.estadoRecurso === 'ESPERANDO_PROVEEDOR').length,
            entregadas: rows.filter((s) => s.estadoRecurso === 'ENTREGADO').length, retrasadas: rows.filter((s) => s.retrasada).length,
            proximasEntregas: rows.filter((s) => { const date = s.fechaEstimadaEntrega ? new Date(s.fechaEstimadaEntrega).getTime() : NaN; return !['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'].includes(s.estadoRecurso) && date >= now && date <= limit; }).length };
    }
}
const text = (id: string, value: string | number) => { document.getElementById(id)!.textContent = String(value); };
const session = getSession();
async function initialize() {
    if (!session) { loginRedirect(); return; }
    try { await api('usuarios/me'); } catch (e) { if (e instanceof ApiError && e.status === 401) return; text('session-loading', 'No se pudo verificar la sesión. Recarga la página para reintentar.'); return; }
    document.getElementById('session-loading')!.hidden = true; document.getElementById('protected-app')!.hidden = false;
    text('nombreUsuario', session.nombre); text('rolUsuario', session.rol); text('avatarUsuario', session.nombre.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase());
    document.body.classList.add('sesion-lista');
    const titles = { ADMIN: ['Dashboard Administrador', 'Vista general del trabajo operativo y de las dependencias externas.'], SUPERVISOR: ['Dashboard Supervisor', 'Resumen de Operaciones y recursos externos de tus proyectos.'], AGENTE: ['Dashboard del Agente', 'Resumen de los tickets operativos y solicitudes dentro de tu alcance.'], CLIENTE: ['Mi Dashboard', 'Resumen de tus incidencias y solicitudes de recursos.'] };
    text('dashboard-title', titles[session.rol][0]!); text('dashboard-description', titles[session.rol][1]!);
    document.getElementById('logout')!.addEventListener('click', () => loginRedirect());
    const container = document.getElementById('protected-app')!;
    initializeSidebarToggle(container);
    const checkExpiry = () => { if (!getSession()) loginRedirect(true); };
    setTimeout(checkExpiry, Math.min(expiry(session.token) - Date.now(), 2147483647));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkExpiry(); });
    addEventListener('pageshow', checkExpiry);
    let flags: Flags = {};
    try { flags = await api<Flags>('configuracion-sistema'); } catch (e) { if (e instanceof ApiError && e.status === 401) return; }
    document.querySelectorAll<HTMLElement>('[data-menu]').forEach((item) => { item.hidden = !visible(item.dataset.menu!, session.rol, flags); });
    document.getElementById('resources')!.hidden = !featureAllowed('solicitudesRecursos', session.rol, flags);
    document.getElementById('refresh')!.addEventListener('click', () => { void load(flags); });
    await load(flags);
}
function group(rows: Ticket[], field: keyof Ticket, historical = false) {
    const result: Counts = {};
    for (const row of rows) { let name = String(row[field] || 'Sin dato'); if (historical && ['ASIGNADO', 'RESUELTO'].includes(name)) name = 'EN_PROGRESO'; result[name] = (result[name] ?? 0) + 1; }
    return result;
}
function report(id: string, counts: Counts) {
    const root = document.getElementById(id)!; root.replaceChildren();
    if (!Object.keys(counts).length) { root.textContent = 'Sin datos registrados.'; return; }
    for (const [name, count] of Object.entries(counts)) { const row = document.createElement('div'); row.className = 'report-item'; const label = document.createElement('span'); label.textContent = name.replaceAll('_', ' '); const value = document.createElement('strong'); value.textContent = String(count); row.append(label, value); root.append(row); }
}
let loading = false;
async function load(flags: Flags) {
    if (loading || !session) return;
    loading = true; const button = document.querySelector<HTMLButtonElement>('#refresh')!; button.disabled = true;
    const status = document.getElementById('dashboard-status')!; status.classList.remove('error'); status.textContent = 'Cargando datos…';
    try {
        const raw = await api<Ticket[]>('tickets');
        if (!Array.isArray(raw)) throw new Error('El sistema devolvió tickets no válidos.');
        const tickets = raw.filter((t) => session.rol === 'CLIENTE' ? t.clienteId === session.id : session.rol === 'AGENTE' ? t.agenteId === session.id : true);
        const operational = tickets.filter((t) => (t.tipoAtencion || 'OPERATIVO').trim().toUpperCase() !== 'RECURSO_EXTERNO');
        const states = group(operational, 'estado', true);
        text('totalOperativos', operational.length); text('ticketsNuevos', states.NUEVO ?? 0); text('ticketsEnProgreso', states.EN_PROGRESO ?? 0); text('ticketsCerrados', states.CERRADO ?? 0);
        // El resumen Nest es preferido; si Reportes está desactivado, Dashboard sigue permitido como en legacy.
        try { const metrics = await api<Counts>('reportes/operacion-resumen'); text('totalOperativos', metrics.totalOperativos ?? 0); text('ticketsNuevos', metrics.ticketsNuevos ?? 0); text('ticketsEnProgreso', (metrics.ticketsEnProgreso ?? 0) + (metrics.ticketsAsignados ?? 0) + (metrics.ticketsResueltos ?? 0)); text('ticketsCerrados', metrics.ticketsCerrados ?? 0); } catch (e) { if (!(e instanceof ApiError && e.status === 403)) throw e; }
        report('estadoReporte', states); report('prioridadReporte', group(operational, 'prioridad')); report('tipoReporte', group(operational, 'tipoIncidenciaNombre'));
        const body = document.getElementById('recent-tickets')!; body.replaceChildren();
        for (const t of tickets.slice(0, 5)) {
            const row = document.createElement('tr');
            const date = t.fechaCreacion ? new Date(t.fechaCreacion) : null;
            for (const value of [t.numeroTicket || '—', t.titulo, t.tipoAtencion || 'OPERATIVO', t.tipoIncidenciaNombre || '—', t.clienteNombre || '—', t.estado, t.prioridad, date && !isNaN(date.getTime()) ? date.toLocaleDateString('es-PA') : 'Sin fecha']) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
            body.append(row);
        }
        if (!tickets.length) { const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 8; cell.textContent = 'No hay tickets registrados dentro de tu alcance.'; row.append(cell); body.append(row); }
        const summary = await api<Counts>('reportes/dashboard-resumen');
        text('totalUsuarios', ['ADMIN', 'SUPERVISOR'].includes(session.rol) ? summary.totalUsuarios ?? 0 : '—'); text('totalComentarios', ['ADMIN', 'SUPERVISOR'].includes(session.rol) ? summary.totalComentarios ?? 0 : '—');
        status.textContent = tickets.length ? 'Datos actualizados.' : 'Sin incidencias registradas.';
    } catch (e) { status.classList.add('error'); status.textContent = e instanceof Error ? e.message : 'No se pudo cargar el dashboard.'; }
    if (featureAllowed('solicitudesRecursos', session.rol, flags) && getSession()) {
        const resourceStatus = document.getElementById('resource-status')!;
        try { const resources = await resourceSummary(); for (const id of ['esperandoProveedor', 'proximasEntregas', 'retrasadas', 'entregadas']) text(id, resources[id] ?? 0); resourceStatus.textContent = resources.totalSolicitudes ? '' : 'Sin solicitudes registradas.'; }
        catch (e) { if (e instanceof ApiError && e.status === 403) document.getElementById('resources')!.hidden = true; else resourceStatus.textContent = e instanceof Error ? e.message : 'No se pudo cargar recursos externos.'; }
    }
    loading = false; button.disabled = false;
}
void initialize();
