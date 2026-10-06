import { api, ApiError } from './http';
import { startAdminPage, reportError, setStatus, node, cell, badge, setBusy, formatDate, confirmed, showNoRows, canManageTarget, fillOptions } from './admin-common';
import type { Role } from './session';

interface User { id: number; nombre: string; apellido: string; correo: string; telefono?: string | null; estado: boolean; rol: Role; fechaCreacion?: string | null }
interface RoleRow { id: number; nombre: Role }
interface Project { id: number; nombre: string; estado: boolean; companiaId: number; companiaNombre?: string | null }
interface Company { id: number; estado: boolean }
interface Assignment { id: number; usuarioId: number; proyectoId: number; usuarioNombre?: string; proyectoNombre?: string | null; companiaNombre?: string | null; estado: boolean; fechaAsignacion?: string | null }
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const roleNames: Role[] = ['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'];

function allowedRoles(actor: Role, roles: RoleRow[]) {
    const sorted = roleNames.filter((role) => roles.some((row) => row.nombre === role));
    return actor === 'SUPERVISOR' ? sorted.filter((role) => role === 'AGENTE' || role === 'CLIENTE') : sorted;
}

function fillRoleSelect(select: HTMLSelectElement, roles: RoleRow[], actor: Role, placeholder = 'Selecciona un rol') {
    fillOptions(select, allowedRoles(actor, roles).map((role) => ({ value: role, label: role })), placeholder);
}

function initList() {
    const status = byId<HTMLElement>('users-status');
    const tbody = byId<HTMLTableSectionElement>('users-body');
    const search = byId<HTMLInputElement>('user-search');
    const roleFilter = byId<HTMLSelectElement>('user-filter-role');
    const stateFilter = byId<HTMLSelectElement>('user-filter-state');
    const count = byId<HTMLElement>('users-count');
    let users: User[] = [];
    let context: Awaited<ReturnType<typeof startAdminPage>>;
    const render = () => {
        const query = search.value.trim().toLocaleLowerCase('es');
        const selectedRole = roleFilter.value;
        const selectedState = stateFilter.value;
        const filtered = users.filter((user) => {
            const text = `${user.nombre} ${user.apellido} ${user.correo} ${user.telefono ?? ''}`.toLocaleLowerCase('es');
            return (!query || text.includes(query)) && (!selectedRole || user.rol === selectedRole) && (!selectedState || String(user.estado) === selectedState);
        });
        tbody.replaceChildren();
        if (!filtered.length) showNoRows(tbody, 7, users.length ? 'No hay usuarios que coincidan con los filtros.' : 'No hay usuarios registrados.');
        for (const user of filtered) {
            const row = node('tr');
            cell(row, `${user.nombre} ${user.apellido}`);
            cell(row, user.correo);
            cell(row, user.telefono || '—');
            cell(row, user.rol);
            const state = node('td'); state.append(badge(user.estado ? 'ACTIVO' : 'INACTIVO', user.estado)); row.append(state);
            cell(row, formatDate(user.fechaCreacion));
            const actions = node('td', '', 'admin-table-actions');
            const details = node('a', 'Ver detalle', 'secondary-btn'); details.href = `/usuarios/${user.id}`; actions.append(details);
            if (context && canManageTarget(context.session.rol, user.rol) && !(context.session.id === user.id && user.estado)) {
                const toggle = node('button', user.estado ? 'Desactivar' : 'Activar', 'secondary-btn') as HTMLButtonElement;
                toggle.type = 'button'; toggle.addEventListener('click', () => void changeState(user, toggle)); actions.append(toggle);
            }
            row.append(actions); tbody.append(row);
        }
        count.textContent = `${filtered.length} de ${users.length} usuarios`;
    };
    const changeState = async (user: User, button: HTMLButtonElement) => {
        const next = !user.estado;
        if (!confirmed(`¿Deseas ${next ? 'activar' : 'desactivar'} a ${user.nombre} ${user.apellido}?`)) return;
        button.disabled = true;
        try { await api(`usuarios/${user.id}/estado`, { method: 'PUT', body: { estado: next } }); await load(); }
        catch (error) { reportError(error, 'users-status'); }
        finally { button.disabled = false; }
    };
    const load = async () => {
        status.textContent = 'Cargando usuarios…';
        try { users = await api<User[]>('usuarios'); status.textContent = ''; render(); }
        catch (error) { reportError(error, 'users-status'); if (error instanceof ApiError && error.status !== 403) showNoRows(tbody, 7, 'No se pudieron cargar los usuarios.'); }
    };
    void (async () => {
        context = await startAdminPage();
        if (!context) return;
        try {
            const roles = await api<RoleRow[]>('roles');
            fillOptions(roleFilter, roles.map((row) => ({ value: row.nombre, label: row.nombre })), 'Todos');
            await load();
        } catch (error) { reportError(error, 'users-status'); }
        search.addEventListener('input', render); roleFilter.addEventListener('change', render); stateFilter.addEventListener('change', render);
    })();
}

function initForm(mode: 'create' | 'edit', id?: number) {
    const form = byId<HTMLFormElement>('user-form');
    const roleSelect = byId<HTMLSelectElement>('user-role');
    const statusId = 'user-form-status';
    let user: User | null = null;
    void (async () => {
        const context = await startAdminPage(); if (!context) return;
        try {
            const roles = await api<RoleRow[]>('roles');
            fillRoleSelect(roleSelect, roles, context.session.rol);
            if (mode === 'edit' && id) {
                const users = await api<User[]>('usuarios'); user = users.find((row) => row.id === id) ?? null;
                if (!user) { setStatus('user-detail-status', 'Usuario no encontrado.', true); return; }
                byId<HTMLElement>('user-detail-title').textContent = `${user.nombre} ${user.apellido}`;
                const canManage = canManageTarget(context.session.rol, user.rol);
                const editButton = byId<HTMLButtonElement>('user-edit-toggle'); editButton.hidden = !canManage;
                const stateButton = byId<HTMLButtonElement>('user-state-toggle'); stateButton.hidden = !canManage || (context.session.id === user.id && user.estado);
                stateButton.textContent = user.estado ? 'Desactivar' : 'Activar';
                const definitions = [['Nombre', user.nombre], ['Apellido', user.apellido], ['Correo', user.correo], ['Teléfono', user.telefono || '—'], ['Rol', user.rol], ['Estado', user.estado ? 'Activo' : 'Inactivo'], ['Creado', formatDate(user.fechaCreacion)]];
                const fields = byId<HTMLElement>('user-detail-fields'); fields.replaceChildren(...definitions.map(([label, value]) => { const wrap = node('div'); wrap.append(node('dt', label), node('dd', String(value))); return wrap; }));
                byId<HTMLElement>('user-detail-status').textContent = '';
                const editable = canManage;
                form.hidden = !editable;
                byId<HTMLElement>('user-edit-section').hidden = true;
                (byId<HTMLInputElement>('user-name')).value = user.nombre;
                byId<HTMLInputElement>('user-surname').value = user.apellido;
                byId<HTMLInputElement>('user-email').value = user.correo;
                byId<HTMLInputElement>('user-phone').value = user.telefono ?? '';
                roleSelect.value = user.rol;
                byId<HTMLInputElement>('user-password').required = false;
                byId<HTMLInputElement>('user-password-confirm').required = false;
                editButton.addEventListener('click', () => { byId<HTMLElement>('user-edit-section').hidden = false; editButton.hidden = true; });
                stateButton.addEventListener('click', async () => {
                    if (!confirmed(`¿Deseas ${user!.estado ? 'desactivar' : 'activar'} a ${user!.nombre} ${user!.apellido}?`)) return;
                    stateButton.disabled = true;
                    try { await api(`usuarios/${id}/estado`, { method: 'PUT', body: { estado: !user!.estado } }); location.reload(); }
                    catch (error) { reportError(error, 'user-detail-status'); stateButton.disabled = false; }
                });
                await loadUserAssignments(context.session, user);
            }
        } catch (error) { reportError(error, mode === 'edit' ? 'user-detail-status' : statusId); }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const save = byId<HTMLButtonElement>('user-save');
            const password = byId<HTMLInputElement>('user-password').value;
            const confirmPassword = byId<HTMLInputElement>('user-password-confirm').value;
            if ((mode === 'create' && password.length < 6) || (password && password.length < 6)) { setStatus(statusId, 'La contraseña debe tener al menos 6 caracteres.', true); return; }
            if (password !== confirmPassword) { setStatus(statusId, 'Las contraseñas no coinciden.', true); return; }
            const body: Record<string, unknown> = {
                nombre: byId<HTMLInputElement>('user-name').value.trim(), apellido: byId<HTMLInputElement>('user-surname').value.trim(),
                correo: byId<HTMLInputElement>('user-email').value.trim().toLowerCase(), telefono: byId<HTMLInputElement>('user-phone').value.trim(), rol: roleSelect.value,
            };
            if (password) body.password = password;
            setBusy(save, true, mode === 'create' ? 'Crear usuario' : 'Guardar cambios');
            try {
                const saved = await api<User>(mode === 'create' ? 'usuarios' : `usuarios/${id}`, { method: mode === 'create' ? 'POST' : 'PUT', body });
                form.reset(); setStatus(statusId, mode === 'create' ? 'Usuario creado correctamente.' : 'Cambios guardados.');
                if (mode === 'create') location.assign(`/usuarios/${saved.id}`);
                else { byId<HTMLElement>('user-edit-section').hidden = true; location.reload(); }
            } catch (error) { reportError(error, statusId); }
            finally { setBusy(save, false, mode === 'create' ? 'Crear usuario' : 'Guardar cambios'); }
        });
        byId<HTMLButtonElement>('user-save').disabled = false;
    })();
}

async function loadUserAssignments(session: { rol: Role }, user: User) {
    const id = user.id;
    const statusId = 'user-assignment-status';
    const tbody = byId<HTMLTableSectionElement>('user-projects-body');
    const select = byId<HTMLSelectElement>('user-project-select');
    const form = byId<HTMLFormElement>('user-project-form');
    const mayAssign = canManageTarget(session.rol, user.rol);
    form.hidden = !mayAssign;
    try {
        const [assignments, projects, companies] = await Promise.all([
            api<Assignment[]>(`usuario-proyectos/usuario/${id}/todas`), api<Project[]>('proyectos'), api<Company[]>('companias'),
        ]);
        const byCompany = new Map(companies.map((company) => [company.id, company]));
        tbody.replaceChildren();
        if (!assignments.length) showNoRows(tbody, 5, 'Este usuario no tiene asignaciones de proyecto.');
        for (const assignment of assignments) {
            const project = projects.find((row) => row.id === assignment.proyectoId);
            const row = node('tr'); cell(row, assignment.proyectoNombre ?? project?.nombre ?? `Proyecto ${assignment.proyectoId}`); cell(row, assignment.companiaNombre ?? project?.companiaNombre);
            const state = node('td'); state.append(badge(assignment.estado ? 'ACTIVA' : 'INACTIVA', assignment.estado)); row.append(state); cell(row, formatDate(assignment.fechaAsignacion));
            const action = node('td', '', 'admin-table-actions');
            if (mayAssign) {
                const button = node('button', assignment.estado ? 'Quitar acceso' : 'Reactivar', 'secondary-btn') as HTMLButtonElement; button.type = 'button';
                button.addEventListener('click', async () => {
                    const active = !assignment.estado;
                    if (!confirmed(`${active ? 'Reactivar' : 'Quitar'} el acceso a ${assignment.proyectoNombre ?? 'este proyecto'}?`)) return;
                    button.disabled = true;
                    try { await api(`usuario-proyectos/${assignment.id}/${active ? 'activar' : 'desactivar'}`, { method: 'PUT' }); await loadUserAssignments(session, user); }
                    catch (error) { reportError(error, statusId); button.disabled = false; }
                }); action.append(button);
            } else action.textContent = 'Solo lectura';
            row.append(action); tbody.append(row);
        }
        const activeAssignments = new Set(assignments.filter((row) => row.estado).map((row) => row.proyectoId));
        const assignable = projects.filter((project) => project.estado && byCompany.get(project.companiaId)?.estado && !activeAssignments.has(project.id));
        fillOptions(select, assignable.map((project) => ({ value: String(project.id), label: `${project.nombre} · ${project.companiaNombre ?? 'Sin compañía'}` })), 'Selecciona un proyecto');
        form.onsubmit = async (event) => {
            event.preventDefault(); const projectId = Number(select.value); const button = byId<HTMLButtonElement>('user-project-add');
            if (!projectId) { setStatus(statusId, 'Selecciona un proyecto activo.', true); return; }
            setBusy(button, true, 'Asignar proyecto');
            try { await api('usuario-proyectos', { method: 'POST', body: { usuarioId: id, proyectoId: projectId } }); setStatus(statusId, 'Proyecto asignado correctamente.'); await loadUserAssignments(session, user); }
            catch (error) { reportError(error, statusId); }
            finally { setBusy(button, false, 'Asignar proyecto'); }
        };
    } catch (error) { reportError(error, statusId); if (!(error instanceof ApiError && error.status === 403)) showNoRows(tbody, 5, 'No se pudieron cargar las asignaciones.'); }
}

const content = document.getElementById('admin-content');
const view = content?.dataset.adminView;
if (view) {
    if (view === 'list') initList();
    else if (view === 'create') initForm('create');
    else if (view === 'detail') initForm('edit', Number(content.dataset.recordId));
}
