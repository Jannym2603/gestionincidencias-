import { api, ApiError } from './http';
import { startAdminPage, reportError, setStatus, node, badge, setBusy, confirmed } from './admin-common';
interface Company { id: number; nombre: string; descripcion?: string | null; estado: boolean; fechaCreacion?: string | null }
interface Project { id: number; companiaId: number; nombre: string; estado: boolean; descripcion?: string | null }
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function renderCompanyCard(company: Company, projects: Project[], admin: boolean) {
    const article = node('article', '', 'company-admin-card');
    const head = node('div', '', 'company-admin-header');
    const title = node('div', '', 'company-admin-title');
    const info = node('div'); info.append(node('h2', company.nombre), node('p', company.descripcion || 'Sin descripción.'));
    const state = node('span'); state.append(badge(company.estado ? 'ACTIVA' : 'INACTIVA', company.estado));
    title.append(info, state); head.append(title);
    const actions = node('div', '', 'company-admin-actions');
    const details = node('a', 'Ver detalle', 'secondary-btn'); details.href = `/companias/${company.id}`; actions.append(details);
    if (admin) {
        const edit = node('a', 'Editar', 'secondary-btn'); edit.href = `/companias/${company.id}#editar`; actions.append(edit);
        const toggle = node('button', company.estado ? 'Desactivar' : 'Activar', 'secondary-btn') as HTMLButtonElement;
        toggle.type = 'button'; toggle.classList.add(company.estado ? 'user-action-danger' : 'user-action-success');
        toggle.addEventListener('click', async () => {
            const next = !company.estado; if (!confirmed(`${next ? 'Activar' : 'Desactivar'} la compañía ${company.nombre}?`)) return;
            toggle.disabled = true;
            try { await api(`companias/${company.id}/estado`, { method: 'PUT', body: next }); await loadList(); }
            catch (error) { reportError(error, 'companies-status'); toggle.disabled = false; }
        }); actions.append(toggle);
    }
    head.append(actions);
    const section = node('div', '', 'company-project-section');
    const sectionHeader = node('div', '', 'company-project-section-header'); sectionHeader.append(node('h3', `Proyectos asociados (${projects.length})`), node('p', 'Selecciona un proyecto para ver su detalle.'));
    const list = node('div', '', 'company-project-list');
    if (!projects.length) list.append(node('p', 'Esta compañía aún no tiene proyectos.', 'empty-message'));
    for (const project of projects) {
        const row = node('div', '', 'company-project-row'); const projectInfo = node('div', '', 'company-project-info');
        const link = node('a', project.nombre); link.href = `/proyectos/${project.id}`; projectInfo.append(link);
        const projectState = node('span'); projectState.append(badge(project.estado ? 'ACTIVO' : 'INACTIVO', project.estado)); row.append(projectInfo, projectState); list.append(row);
    }
    section.append(sectionHeader, list); article.append(head, section); return article;
}

async function loadList() {
    const status = byId<HTMLElement>('companies-status'); const list = byId<HTMLElement>('companies-list');
    status.textContent = 'Cargando compañías…'; list.replaceChildren();
    try {
        const [companies, projects] = await Promise.all([api<Company[]>('companias'), api<Project[]>('proyectos')]);
        status.textContent = '';
        if (!companies.length) { list.append(node('p', 'No hay compañías registradas.', 'empty-message')); return; }
        const actor = (document.getElementById('protected-app')?.querySelector('#rolUsuario')?.textContent ?? 'CLIENTE');
        const admin = actor === 'ADMIN';
        for (const company of companies) list.append(renderCompanyCard(company, projects.filter((project) => project.companiaId === company.id), admin));
    } catch (error) { reportError(error, 'companies-status'); if (!(error instanceof ApiError && error.status === 403)) list.textContent = 'No se pudieron cargar las compañías.'; }
}

async function initList() {
    const context = await startAdminPage(); if (!context) return;
    byId<HTMLAnchorElement>('company-create-link').hidden = context.session.rol !== 'ADMIN';
    byId<HTMLButtonElement>('companies-reload').addEventListener('click', () => void loadList());
    await loadList();
}

async function initForm(mode: 'create' | 'edit', id?: number) {
    const context = await startAdminPage(); if (!context) return;
    const form = byId<HTMLFormElement>('company-form');
    if (context.session.rol !== 'ADMIN') { reportError(new ApiError(403, 'Solo ADMIN puede crear o modificar compañías.'), 'company-form-status'); return; }
    if (mode === 'edit' && id) {
        try {
            const company = await api<Company>(`companias/${id}`);
            byId<HTMLInputElement>('company-name').value = company.nombre;
            byId<HTMLTextAreaElement>('company-description').value = company.descripcion ?? '';
            byId<HTMLSelectElement>('company-state').value = String(company.estado);
        } catch (error) { reportError(error, 'company-detail-status'); return; }
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); const button = byId<HTMLButtonElement>('company-save');
        const body = { nombre: byId<HTMLInputElement>('company-name').value.trim(), descripcion: byId<HTMLTextAreaElement>('company-description').value.trim(), estado: byId<HTMLSelectElement>('company-state').value === 'true' };
        setBusy(button, true, 'Guardar compañía');
        try {
            const saved = await api<Company>(mode === 'create' ? 'companias' : `companias/${id}`, { method: mode === 'create' ? 'POST' : 'PUT', body });
            setStatus('company-form-status', 'Compañía guardada correctamente.');
            location.assign(`/companias/${saved.id}`);
        } catch (error) { reportError(error, 'company-form-status'); }
        finally { setBusy(button, false, 'Guardar compañía'); }
    });
    byId<HTMLButtonElement>('company-save').disabled = false;
}

async function initDetail(id: number) {
    const context = await startAdminPage(); if (!context) return;
    const admin = context.session.rol === 'ADMIN';
    const list = byId<HTMLElement>('company-projects-list');
    try {
        const [company, projects] = await Promise.all([api<Company>(`companias/${id}`), api<Project[]>(`proyectos/compania/${id}`)]);
        byId<HTMLElement>('company-detail-title').textContent = company.nombre;
        byId<HTMLElement>('company-detail-description').textContent = company.descripcion || 'Sin descripción.';
        const defs = [['Estado', company.estado ? 'Activa' : 'Inactiva'], ['Proyectos', String(projects.length)], ['Creada', company.fechaCreacion ? new Date(company.fechaCreacion).toLocaleDateString('es-PA') : '—']];
        const fields = byId<HTMLElement>('company-detail-fields'); fields.replaceChildren(...defs.map(([label, value]) => { const wrap = node('div'); wrap.append(node('dt', label), node('dd', value)); return wrap; }));
        byId<HTMLElement>('company-detail-status').textContent = '';
        byId<HTMLButtonElement>('company-edit-toggle').hidden = !admin;
        byId<HTMLButtonElement>('company-state-toggle').hidden = !admin;
        const editSection = byId<HTMLElement>('company-edit-section');
        const editButton = byId<HTMLButtonElement>('company-edit-toggle');
        editButton.addEventListener('click', async () => {
            editButton.hidden = true;
            await initForm('edit', id);
            editSection.hidden = false;
        });
        const stateButton = byId<HTMLButtonElement>('company-state-toggle'); stateButton.textContent = company.estado ? 'Desactivar' : 'Activar';
        stateButton.addEventListener('click', async () => {
            const next = !company.estado; if (!confirmed(`${next ? 'Activar' : 'Desactivar'} la compañía ${company.nombre}?`)) return;
            stateButton.disabled = true;
            try { await api(`companias/${id}/estado`, { method: 'PUT', body: next }); location.reload(); }
            catch (error) { reportError(error, 'company-detail-status'); stateButton.disabled = false; }
        });
        list.replaceChildren();
        if (!projects.length) list.append(node('p', 'Esta compañía aún no tiene proyectos.', 'empty-message'));
        for (const project of projects) {
            const row = node('a', '', 'admin-project-link'); row.href = `/proyectos/${project.id}`;
            row.append(node('span', project.nombre), badge(project.estado ? 'ACTIVO' : 'INACTIVO', project.estado)); list.append(row);
        }
        byId<HTMLElement>('company-projects-status').textContent = '';
    } catch (error) { reportError(error, 'company-detail-status'); list.textContent = 'No se pudieron cargar los proyectos asociados.'; }
}

const content = document.getElementById('admin-content'); const view = content?.dataset.adminView;
if (content && view === 'list') void initList();
else if (content && view === 'create') void initForm('create');
else if (content && view === 'detail') void initDetail(Number(content.dataset.recordId));
