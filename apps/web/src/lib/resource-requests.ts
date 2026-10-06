import { api, ApiError } from './http';
import { initializePage } from './page-layout';
import { visible } from './navigation';
import type { Role } from './session';

interface ResourceRequest { id: number; ticketId: number; numeroTicket?: string; tituloTicket?: string; clienteNombre?: string; companiaId?: number; companiaNombre?: string; proyectoId?: number; proyectoNombre?: string; categoria?: string; recurso?: string; cantidad?: number; proveedor?: string | null; estadoRecurso?: string; fechaEstimadaEntrega?: string | null; situacionEntrega?: string; retrasada?: boolean; diasRetraso?: number; motivoRetraso?: string | null; detalleRetraso?: string | null }
const $ = (id: string) => document.getElementById(id)!;
let requests: ResourceRequest[] = [];
let role: Role = 'CLIENTE';
function addOptions(select: HTMLSelectElement, options: Array<[string, string]>, placeholder: string, preserve = false) { const current = preserve ? select.value : ''; select.replaceChildren(new Option(placeholder, ''), ...options.map(([value, label]) => new Option(label, value))); if ([...select.options].some((item) => item.value === current)) select.value = current; }
function date(value?: string | null) { if (!value) return '—'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('es-PA'); }
function filtered() {
    const search = ($('resource-search') as HTMLInputElement).value.trim().toLocaleLowerCase('es');
    const state = ($('resource-state-filter') as HTMLSelectElement).value;
    const delay = ($('resource-delay-filter') as HTMLSelectElement).value;
    const category = ($('resource-category-filter') as HTMLSelectElement).value;
    const company = ($('resource-company-filter') as HTMLSelectElement).value;
    const project = ($('resource-project-filter') as HTMLSelectElement).value;
    return requests.filter((item) => {
        const text = [item.numeroTicket, item.tituloTicket, item.clienteNombre, item.companiaNombre, item.proyectoNombre, item.categoria, item.recurso, item.proveedor, item.estadoRecurso, item.situacionEntrega, item.motivoRetraso, item.detalleRetraso].join(' ').toLocaleLowerCase('es');
        const late = item.retrasada === true || item.situacionEntrega === 'RETRASADO';
        return (!search || text.includes(search)) && (!state || item.estadoRecurso === state) && (!delay || (delay === 'RETRASADO' ? late : !late)) && (!category || item.categoria === category) && (!company || String(item.companiaId) === company) && (!project || String(item.proyectoId) === project);
    });
}
function render() {
    const rows = filtered(); const body = $('resource-requests-body') as HTMLTableSectionElement; body.replaceChildren();
    if (!rows.length) { const row = body.insertRow(), cell = row.insertCell(); cell.colSpan = 12; cell.textContent = requests.length ? 'No hay solicitudes que coincidan con los filtros.' : 'No hay solicitudes de recursos para mostrar.'; }
    for (const item of rows) {
        const row = body.insertRow();
        const ticket = row.insertCell(), ticketLink = document.createElement('a'); ticketLink.href = `/tickets/${item.ticketId}#resource-section`; ticketLink.textContent = item.numeroTicket || `Ticket #${item.ticketId}`; ticket.append(ticketLink);
        for (const value of [item.clienteNombre, item.companiaNombre, item.proyectoNombre, item.categoria, item.recurso, item.cantidad, item.proveedor, item.estadoRecurso, date(item.fechaEstimadaEntrega), item.situacionEntrega === 'RETRASADO' || item.retrasada ? `RETRASADO · ${item.diasRetraso ?? 0} día(s)` : item.situacionEntrega || '—']) row.insertCell().textContent = value == null || value === '' ? '—' : String(value);
        const action = row.insertCell(), link = document.createElement('a'); link.className = 'secondary-btn'; link.href = `/tickets/${item.ticketId}#resource-section`; link.textContent = role === 'ADMIN' || role === 'SUPERVISOR' ? 'Administrar' : 'Ver'; action.append(link);
    }
    $('resource-requests-count').textContent = `${rows.length} solicitud(es) encontrada(s). ${rows.filter((item) => item.retrasada || item.situacionEntrega === 'RETRASADO').length} retrasada(s).`;
}
function fillFilters() {
    addOptions($('resource-category-filter') as HTMLSelectElement, [...new Set(requests.map((item) => item.categoria).filter((value): value is string => !!value))].sort().map((value) => [value, value]), 'Todas', true);
    const companies = new Map<string, string>(); for (const item of requests) if (item.companiaId != null && item.companiaNombre) companies.set(String(item.companiaId), item.companiaNombre);
    addOptions($('resource-company-filter') as HTMLSelectElement, [...companies].sort((a, b) => a[1].localeCompare(b[1], 'es')), 'Todas', true); fillProjects();
}
function fillProjects() {
    const company = ($('resource-company-filter') as HTMLSelectElement).value; const projects = new Map<string, string>();
    for (const item of requests) if (item.proyectoId != null && item.proyectoNombre && (!company || String(item.companiaId) === company)) projects.set(String(item.proyectoId), item.proyectoNombre);
    addOptions($('resource-project-filter') as HTMLSelectElement, [...projects].sort((a, b) => a[1].localeCompare(b[1], 'es')), 'Todos', true);
}
async function load() {
    const status = $('resource-requests-status'); status.textContent = 'Cargando solicitudes…'; status.classList.remove('error');
    const body = $('resource-requests-body') as HTMLTableSectionElement; body.replaceChildren(); const loading = body.insertRow(), cell = loading.insertCell(); cell.colSpan = 12; cell.textContent = 'Cargando solicitudes…';
    try {
        requests = await api<ResourceRequest[]>('solicitudes-recursos'); fillFilters(); render();
        status.textContent = requests.length ? '' : 'No hay solicitudes disponibles para tu alcance.';
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return;
        const message = error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.'; status.textContent = message; status.classList.add('error'); body.replaceChildren(); const row = body.insertRow(), errorCell = row.insertCell(); errorCell.colSpan = 12; errorCell.textContent = message;
    }
}
void initializePage().then((context) => {
    if (!context) return; role = context.session.rol;
    if (!visible('solicitudes-recursos', role, context.flags)) { $('resource-requests-denied').textContent = 'Las solicitudes de recursos no están habilitadas para tu rol.'; $('resource-requests-denied').hidden = false; return; }
    $('resource-requests-content').hidden = false;
    if (role === 'AGENTE' || role === 'CLIENTE') $('resource-requests-description').textContent = 'Consulta las solicitudes de recursos asociadas a tickets de tu alcance.';
    $('resource-search').addEventListener('input', render);
    for (const id of ['resource-state-filter', 'resource-delay-filter', 'resource-category-filter', 'resource-project-filter']) $(id).addEventListener('change', render);
    $('resource-company-filter').addEventListener('change', () => { fillProjects(); render(); });
    $('resource-requests-clear').addEventListener('click', () => { ($('resource-search') as HTMLInputElement).value = ''; for (const id of ['resource-state-filter', 'resource-delay-filter', 'resource-category-filter', 'resource-company-filter', 'resource-project-filter']) ($(id) as HTMLSelectElement).value = ''; fillProjects(); render(); });
    $('resource-requests-reload').addEventListener('click', () => void load()); void load();
});
