import { api, ApiError } from './http';
import { startAdminPage, reportError, setStatus, node, cell, badge, setBusy, formatDate, confirmed, showNoRows, fillOptions } from './admin-common';
import type { Role } from './session';
interface Company { id: number; nombre: string; estado: boolean }
interface Project { id: number; companiaId: number; companiaNombre?: string | null; nombre: string; descripcion?: string | null; estado: boolean; fechaCreacion?: string | null }
interface User { id: number; nombre: string; apellido: string; correo: string; estado: boolean; rol: Role }
interface Assignment { id: number; usuarioId: number; usuarioNombre?: string; usuarioCorreo?: string; proyectoId: number; estado: boolean; fechaAsignacion?: string | null }
interface Ticket { id: number; numeroTicket?: string | null; titulo?: string | null; clienteNombre?: string | null; estado?: string | null; prioridad?: string | null; estadoSlaRespuesta?: string | null; estadoSlaResolucion?: string | null; fechaCreacion?: string | null }
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function roleFromHeader(): Role { return (byId<HTMLElement>('rolUsuario').textContent || 'CLIENTE') as Role; }

function initList() {
    const body = byId<HTMLTableSectionElement>('projects-body');
    const status = byId<HTMLElement>('projects-status');
    const search = byId<HTMLInputElement>('project-search');
    const stateFilter = byId<HTMLSelectElement>('project-filter-state');
    let projects: Project[] = [];
    const actor = roleFromHeader();
    const render = () => {
        const query = search.value.trim().toLocaleLowerCase('es'); const state = stateFilter.value;
        const filtered = projects.filter((project) => (!query || `${project.nombre} ${project.companiaNombre ?? ''}`.toLocaleLowerCase('es').includes(query)) && (!state || String(project.estado) === state));
        body.replaceChildren();
        if (!filtered.length) showNoRows(body, 5, projects.length ? 'No hay proyectos que coincidan con los filtros.' : 'No tienes proyectos disponibles.');
        for (const project of filtered) {
            const row = node('tr');
            const name = node('td'); const link = node('a', project.nombre); link.href = `/proyectos/${project.id}`; name.append(link); row.append(name);
            cell(row, project.companiaNombre); cell(row, project.descripcion || '—');
            const stateCell = node('td'); stateCell.append(badge(project.estado ? 'ACTIVO' : 'INACTIVO', project.estado)); row.append(stateCell);
            const actions = node('td', '', 'admin-table-actions'); const detail = node('a', 'Ver detalle', 'secondary-btn'); detail.href = `/proyectos/${project.id}`; actions.append(detail);
            if (actor === 'ADMIN') {
                const edit = node('a', 'Editar', 'secondary-btn'); edit.href = `/proyectos/${project.id}#editar`; actions.append(edit);
                const toggle = node('button', project.estado ? 'Desactivar' : 'Activar', 'secondary-btn') as HTMLButtonElement; toggle.type = 'button';
                toggle.addEventListener('click', async () => {
                    const next = !project.estado; if (!confirmed(`${next ? 'Activar' : 'Desactivar'} el proyecto ${project.nombre}?`)) return;
                    toggle.disabled = true;
                    try { await api(`proyectos/${project.id}/estado`, { method: 'PUT', body: next }); await load(); }
                    catch (error) { reportError(error, 'projects-status'); toggle.disabled = false; }
                }); actions.append(toggle);
            }
            row.append(actions); body.append(row);
        }
        byId<HTMLElement>('projects-count').textContent = `${filtered.length} de ${projects.length} proyectos`;
    };
    const load = async () => {
        status.textContent = 'Cargando proyectos…';
        try { projects = await api<Project[]>('proyectos'); status.textContent = ''; render(); }
        catch (error) { reportError(error, 'projects-status'); if (!(error instanceof ApiError && error.status === 403)) showNoRows(body, 5, 'No se pudieron cargar los proyectos.'); }
    };
    void (async () => {
        const context = await startAdminPage(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE']); if (!context) return;
        if (context.session.rol === 'ADMIN') byId<HTMLAnchorElement>('project-create-link').hidden = false;
        if (context.session.rol === 'SUPERVISOR') byId<HTMLElement>('projects-description').textContent = 'Proyectos dentro de tu alcance. Puedes administrar sus asignaciones.';
        byId<HTMLButtonElement>('projects-reload').addEventListener('click', () => void load());
        search.addEventListener('input', render); stateFilter.addEventListener('change', render);
        await load();
    })();
}

async function loadCompanies(select: HTMLSelectElement, selectedId?: number) {
    const companies = await api<Company[]>('companias');
    const options = companies.filter((company) => company.estado || company.id === selectedId).map((company) => ({ value: String(company.id), label: `${company.nombre}${company.estado ? '' : ' (inactiva)'}` }));
    fillOptions(select, options, 'Selecciona una compañía');
    if (selectedId && options.some((item) => item.value === String(selectedId))) select.value = String(selectedId);
    return companies;
}

async function setupProjectForm(mode: 'create' | 'edit', id?: number, existing?: Project) {
    const context = await startAdminPage(); if (!context) return;
    if (context.session.rol !== 'ADMIN') { reportError(new ApiError(403, 'Solo ADMIN puede crear o modificar proyectos.'), 'project-form-status'); return; }
    const form = byId<HTMLFormElement>('project-form'); const companySelect = byId<HTMLSelectElement>('project-company');
    try {
        await loadCompanies(companySelect, existing?.companiaId);
        if (existing) {
            byId<HTMLInputElement>('project-name').value = existing.nombre;
            byId<HTMLTextAreaElement>('project-description').value = existing.descripcion ?? '';
            byId<HTMLSelectElement>('project-state').value = String(existing.estado);
            companySelect.value = String(existing.companiaId);
        }
    } catch (error) { reportError(error, 'project-form-status'); return; }
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); const button = byId<HTMLButtonElement>('project-save');
        const body = { companiaId: Number(companySelect.value), nombre: byId<HTMLInputElement>('project-name').value.trim(), descripcion: byId<HTMLTextAreaElement>('project-description').value.trim(), estado: byId<HTMLSelectElement>('project-state').value === 'true' };
        setBusy(button, true, 'Guardar proyecto');
        try {
            const saved = await api<Project>(mode === 'create' ? 'proyectos' : `proyectos/${id}`, { method: mode === 'create' ? 'POST' : 'PUT', body });
            setStatus('project-form-status', 'Proyecto guardado correctamente.'); location.assign(`/proyectos/${saved.id}`);
        } catch (error) { reportError(error, 'project-form-status'); }
        finally { setBusy(button, false, 'Guardar proyecto'); }
    });
    byId<HTMLButtonElement>('project-save').disabled = false;
}

function initCreate() { void setupProjectForm('create'); }

function renderProjectTickets(tickets: Ticket[], projectId: number) {
    const scoped = tickets.filter((ticket) => (ticket as Ticket & { proyectoId?: number }).proyectoId === projectId).sort((a, b) => String(b.fechaCreacion ?? '').localeCompare(String(a.fechaCreacion ?? '')));
    renderProjectHealth(scoped);
    const body = byId<HTMLTableSectionElement>('project-tickets-body'); body.replaceChildren();
    for (const ticket of scoped.slice(0, 10)) {
        const row = node('tr'); cell(row, ticket.numeroTicket || `#${ticket.id}`); cell(row, ticket.titulo || 'Sin título'); cell(row, ticket.clienteNombre);
        cell(row, ticket.estado); cell(row, ticket.prioridad); cell(row, formatDate(ticket.fechaCreacion));
        const action = node('td'); const link = node('a', 'Abrir'); link.href = `/tickets/${ticket.id}`; action.append(link); row.append(action); body.append(row);
    }
    if (!scoped.length) showNoRows(body, 7, 'No hay tickets visibles para este proyecto.');
    byId<HTMLElement>('project-ticket-total').textContent = String(scoped.length);
    byId<HTMLElement>('project-ticket-new').textContent = String(scoped.filter((ticket) => ticket.estado === 'NUEVO').length);
    byId<HTMLElement>('project-ticket-progress').textContent = String(scoped.filter((ticket) => ['EN_PROGRESO', 'ASIGNADO', 'RESUELTO'].includes(String(ticket.estado))).length);
    byId<HTMLElement>('project-ticket-closed').textContent = String(scoped.filter((ticket) => ticket.estado === 'CERRADO').length);
}

function renderProjectHealth(tickets: Ticket[]) {
    const openStates = ['NUEVO', 'ASIGNADO', 'EN_PROGRESO', 'RESUELTO'];
    const open = tickets.filter((ticket) => openStates.includes(String(ticket.estado ?? '').trim().toUpperCase()));
    const critical = open.filter((ticket) => ['P1_CRITICA', 'P1_CRÍTICA', 'CRITICA', 'CRÍTICA'].includes(String(ticket.prioridad ?? '').trim().toUpperCase())).length;
    const overdue = tickets.filter((ticket) => [ticket.estadoSlaRespuesta, ticket.estadoSlaResolucion].some((state) => ['VENCIDO', 'INCUMPLIDO'].includes(String(state ?? '').trim().toUpperCase()))).length;
    const risk = tickets.filter((ticket) => ![ticket.estadoSlaRespuesta, ticket.estadoSlaResolucion].some((state) => ['VENCIDO', 'INCUMPLIDO'].includes(String(state ?? '').trim().toUpperCase())) && [ticket.estadoSlaRespuesta, ticket.estadoSlaResolucion].some((state) => String(state ?? '').trim().toUpperCase() === 'EN_RIESGO')).length;
    const score = tickets.length ? Math.max(0, Math.min(100, 100 - Math.round(open.length / tickets.length * 25) - Math.min(50, overdue * 20) - Math.min(30, risk * 10) - Math.min(30, critical * 15))) : 100;
    const status = score < 65 ? 'CRÍTICO' : score < 85 ? 'ATENCIÓN' : 'NORMAL';
    const variant = score < 65 ? 'critical' : score < 85 ? 'attention' : 'normal';
    const description = !tickets.length ? 'El proyecto no presenta incidencias visibles que afecten su operación.' : score < 65 ? 'El proyecto requiere atención prioritaria por incidencias o compromisos de servicio afectados.' : score < 85 ? 'El proyecto presenta factores que conviene atender antes de que afecten más su operación.' : 'El proyecto mantiene un estado operativo estable según sus tickets y compromisos SLA.';
    const panel = byId<HTMLElement>('project-health-panel'); panel.className = `project-health-detail project-health-${variant}`;
    const badgeEl = byId<HTMLElement>('project-health-badge'); badgeEl.className = `project-health-badge health-${variant}`; badgeEl.lastChild!.textContent = status;
    byId<HTMLElement>('project-health-description').textContent = description;
    byId<HTMLElement>('project-health-score').textContent = `${score}%`;
    byId<HTMLElement>('project-health-progress').setAttribute('aria-valuenow', String(score));
    const bar = byId<HTMLElement>('project-health-bar'); bar.className = `health-bar-${variant}`; bar.style.width = `${score}%`;
    byId<HTMLElement>('project-health-open').textContent = String(open.length);
    byId<HTMLElement>('project-health-risk').textContent = String(risk);
    byId<HTMLElement>('project-health-overdue').textContent = String(overdue);
    byId<HTMLElement>('project-health-critical').textContent = String(critical);
    const factors = [`${open.length} ticket(s) abierto(s) de ${tickets.length}`, `${risk} SLA en riesgo`, `${overdue} SLA vencido(s)`, `${critical} ticket(s) crítico(s) abierto(s)`].filter((value) => !value.startsWith('0 '));
    byId<HTMLElement>('project-health-explanation').textContent = factors.length ? `${status}: ${factors.join(' · ')}.` : 'Sin factores negativos detectados. El proyecto se encuentra estable según la información disponible.';
}

async function loadProjectAssignments(project: Project, sessionRole: Role) {
    const body = byId<HTMLTableSectionElement>('project-users-body'); const form = byId<HTMLFormElement>('project-user-form');
    if (!['ADMIN', 'SUPERVISOR'].includes(sessionRole)) {
        form.hidden = true; setStatus('project-users-status', 'La consulta de asignaciones está disponible para ADMIN y SUPERVISOR.'); showNoRows(body, 6, 'Acceso de solo lectura.'); return;
    }
    form.hidden = false;
    try {
        const [assignments, users] = await Promise.all([api<Assignment[]>(`usuario-proyectos/proyecto/${project.id}`), api<User[]>('usuarios')]);
        body.replaceChildren();
        if (!assignments.length) showNoRows(body, 6, 'No hay usuarios asignados a este proyecto.');
        for (const assignment of assignments) {
            const user = users.find((item) => item.id === assignment.usuarioId); const row = node('tr');
            cell(row, assignment.usuarioNombre ?? `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim()); cell(row, assignment.usuarioCorreo ?? user?.correo); cell(row, user?.rol);
            const state = node('td'); state.append(badge('ACTIVA', true)); row.append(state); cell(row, formatDate(assignment.fechaAsignacion));
            const action = node('td', '', 'admin-table-actions');
            const remove = node('button', 'Quitar acceso', 'secondary-btn') as HTMLButtonElement; remove.type = 'button'; remove.addEventListener('click', async () => {
                if (!confirmed(`¿Quitar el acceso de ${assignment.usuarioNombre ?? 'este usuario'} a ${project.nombre}?`)) return;
                remove.disabled = true;
                try { await api(`usuario-proyectos/${assignment.id}/desactivar`, { method: 'PUT' }); await loadProjectAssignments(project, sessionRole); }
                catch (error) { reportError(error, 'project-users-status'); remove.disabled = false; }
            }); action.append(remove); row.append(action); body.append(row);
        }
        const assigned = new Set(assignments.map((item) => item.usuarioId));
        const selectable = users.filter((user) => user.estado && !assigned.has(user.id));
        const select = byId<HTMLSelectElement>('project-user-select'); fillOptions(select, selectable.map((user) => ({ value: String(user.id), label: `${user.nombre} ${user.apellido} · ${user.rol}` })), 'Selecciona un usuario');
        form.onsubmit = async (event) => {
            event.preventDefault(); const userId = Number(select.value); const button = byId<HTMLButtonElement>('project-user-add');
            if (!userId) { setStatus('project-users-status', 'Selecciona un usuario activo.', true); return; }
            setBusy(button, true, 'Asignar usuario');
            try { await api('usuario-proyectos', { method: 'POST', body: { usuarioId: userId, proyectoId: project.id } }); setStatus('project-users-status', 'Usuario asignado correctamente.'); await loadProjectAssignments(project, sessionRole); }
            catch (error) { reportError(error, 'project-users-status'); }
            finally { setBusy(button, false, 'Asignar usuario'); }
        };
        byId<HTMLElement>('project-users-status').textContent = '';
    } catch (error) { reportError(error, 'project-users-status'); if (!(error instanceof ApiError && error.status === 403)) showNoRows(body, 6, 'No se pudieron cargar las asignaciones.'); }
}

async function initDetail(id: number) {
    const context = await startAdminPage(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE']); if (!context) return;
    const role = context.session.rol; const admin = role === 'ADMIN';
    try {
        const [project, tickets] = await Promise.all([api<Project>(`proyectos/${id}`), api<Ticket[]>('tickets')]);
        byId<HTMLElement>('project-detail-title').textContent = project.nombre;
        byId<HTMLElement>('project-detail-description').textContent = project.descripcion || 'Sin descripción.';
        const values: Array<[string, string]> = [['Compañía', project.companiaNombre || '—'], ['Estado', project.estado ? 'Activo' : 'Inactivo'], ['Creado', formatDate(project.fechaCreacion)], ['ID', String(project.id)]];
        const fields = byId<HTMLElement>('project-detail-fields'); fields.replaceChildren(...values.map(([label, value]) => { const wrap = node('div'); wrap.append(node('dt', label), node('dd', value)); return wrap; }));
        byId<HTMLElement>('project-detail-status').textContent = '';
        const editButton = byId<HTMLButtonElement>('project-edit-toggle'); editButton.hidden = !admin;
        const stateButton = byId<HTMLButtonElement>('project-state-toggle'); stateButton.hidden = !admin; stateButton.textContent = project.estado ? 'Desactivar' : 'Activar';
        const editSection = byId<HTMLElement>('project-edit-section');
        editButton.addEventListener('click', async () => {
            editButton.hidden = true;
            await setupProjectForm('edit', project.id, project);
            editSection.hidden = false;
        });
        stateButton.addEventListener('click', async () => {
            const next = !project.estado; if (!confirmed(`${next ? 'Activar' : 'Desactivar'} el proyecto ${project.nombre}?`)) return;
            stateButton.disabled = true;
            try { await api(`proyectos/${project.id}/estado`, { method: 'PUT', body: next }); location.reload(); }
            catch (error) { reportError(error, 'project-detail-status'); stateButton.disabled = false; }
        });
        renderProjectTickets(tickets, project.id);
        await loadProjectAssignments(project, role);
    } catch (error) { reportError(error, 'project-detail-status'); }
}

const content = document.getElementById('admin-content'); const view = content?.dataset.adminView;
if (content && view === 'list') {
    initList();
} else if (content && view === 'create') initCreate();
else if (content && view === 'detail') void initDetail(Number(content.dataset.recordId));
