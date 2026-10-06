import { api, ApiError } from './http';
import { initializePage } from './page-layout';
import { visible } from './navigation';
import type { Role } from './session';

interface Ticket { id: number; numeroTicket?: string; proyectoId?: number; proyectoNombre?: string; companiaId?: number; companiaNombre?: string }
interface History { id: number; ticketId: number; numeroTicket?: string; usuarioId?: number | null; nombreUsuario?: string | null; accion?: string; valorAnterior?: string | null; valorNuevo?: string | null; descripcion?: string | null; fechaCreacion?: string | null }
type EventRow = History & { ticket: Ticket };
const $ = (id: string) => document.getElementById(id)!;
let events: EventRow[] = [];
function option(select: HTMLSelectElement, value: string, label: string) { select.add(new Option(label, value)); }
function formatDate(value?: string | null) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-PA'); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'No se pudo cargar el historial.'; }

function filtered() {
    const company = Number(($('history-company') as HTMLSelectElement).value || 0);
    const project = Number(($('history-project') as HTMLSelectElement).value || 0);
    const ticket = Number(($('history-ticket') as HTMLSelectElement).value || 0);
    const action = ($('history-action') as HTMLSelectElement).value;
    return events.filter((item) => (!company || item.ticket.companiaId === company)
        && (!project || item.ticket.proyectoId === project)
        && (!ticket || item.ticketId === ticket)
        && (!action || item.accion === action));
}

function renderRows() {
    const rows = filtered().sort((a, b) => new Date(b.fechaCreacion || 0).getTime() - new Date(a.fechaCreacion || 0).getTime());
    const body = $('global-history-body') as HTMLTableSectionElement;
    body.replaceChildren();
    if (!rows.length) {
        const row = body.insertRow(), cell = row.insertCell(); cell.colSpan = 9; cell.textContent = events.length ? 'No hay eventos que coincidan con los filtros seleccionados.' : 'No hay eventos disponibles.';
    }
    for (const item of rows) {
        const row = body.insertRow();
        const ticketCell = row.insertCell(); const link = document.createElement('a'); link.href = `/tickets/${item.ticketId}`; link.textContent = item.numeroTicket || item.ticket.numeroTicket || `Ticket #${item.ticketId}`; ticketCell.append(link);
        for (const value of [item.ticket.companiaNombre, item.ticket.proyectoNombre, item.nombreUsuario || 'Sistema', (item.accion || '').replaceAll('_', ' '), item.valorAnterior, item.valorNuevo, item.descripcion, formatDate(item.fechaCreacion)]) row.insertCell().textContent = value || '—';
    }
    $('global-history-count').textContent = `${rows.length} evento(s) encontrado(s).`;
    const selectedTicket = ($('history-ticket') as HTMLSelectElement);
    const selectedProject = ($('history-project') as HTMLSelectElement);
    const selectedCompany = ($('history-company') as HTMLSelectElement);
    $('global-history-scope').textContent = selectedTicket.value ? selectedTicket.selectedOptions[0]?.text || 'Ticket seleccionado' : selectedProject.value ? selectedProject.selectedOptions[0]?.text || 'Proyecto seleccionado' : selectedCompany.value ? selectedCompany.selectedOptions[0]?.text || 'Compañía seleccionada' : 'Todos los eventos disponibles';
}

function fillActionFilter() {
    const select = $('history-action') as HTMLSelectElement; select.replaceChildren(new Option('Todas las acciones', ''));
    for (const action of [...new Set(events.map((item) => item.accion).filter((value): value is string => !!value))].sort()) option(select, action, action.replaceAll('_', ' '));
}
function fillCompanyFilter() {
    const select = $('history-company') as HTMLSelectElement; select.replaceChildren(new Option('Todas las compañías', ''));
    const companies = new Map<number, string>();
    for (const item of events) if (item.ticket.companiaId && item.ticket.companiaNombre) companies.set(item.ticket.companiaId, item.ticket.companiaNombre);
    for (const [id, name] of [...companies].sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }))) option(select, String(id), name);
}
function fillProjectFilter() {
    const select = $('history-project') as HTMLSelectElement; const companyId = Number(($('history-company') as HTMLSelectElement).value || 0); const prior = select.value;
    select.replaceChildren(new Option('Todos los proyectos', ''));
    const projects = new Map<number, string>();
    for (const item of events) if (item.ticket.proyectoId && item.ticket.proyectoNombre && (!companyId || item.ticket.companiaId === companyId)) projects.set(item.ticket.proyectoId, item.ticket.proyectoNombre);
    for (const [id, name] of [...projects].sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }))) option(select, String(id), name);
    if ([...select.options].some((item) => item.value === prior)) select.value = prior;
}
function fillTicketFilter() {
    const select = $('history-ticket') as HTMLSelectElement; const companyId = Number(($('history-company') as HTMLSelectElement).value || 0); const projectId = Number(($('history-project') as HTMLSelectElement).value || 0); const prior = select.value;
    select.replaceChildren(new Option('Todos los tickets', ''));
    const tickets = new Map<number, string>();
    for (const item of events) if ((!companyId || item.ticket.companiaId === companyId) && (!projectId || item.ticket.proyectoId === projectId)) tickets.set(item.ticketId, item.numeroTicket || item.ticket.numeroTicket || `Ticket #${item.ticketId}`);
    for (const [id, name] of [...tickets].sort((a, b) => b[1].localeCompare(a[1], 'es', { numeric: true }))) option(select, String(id), name);
    if ([...select.options].some((item) => item.value === prior)) select.value = prior;
}

async function load() {
    const status = $('global-history-status'); status.textContent = 'Cargando historial…'; status.classList.remove('error');
    const body = $('global-history-body') as HTMLTableSectionElement; body.replaceChildren(); const row = body.insertRow(), cell = row.insertCell(); cell.colSpan = 9; cell.textContent = 'Cargando historial…';
    try {
        const tickets = await api<Ticket[]>('tickets');
        const results = await Promise.all(tickets.map(async (ticket) => ({ ticket, rows: await api<History[]>(`historial-tickets/ticket/${ticket.id}`) })));
        events = results.flatMap(({ ticket, rows }) => rows.map((item) => ({ ...item, ticket })));
        fillCompanyFilter(); fillProjectFilter(); fillTicketFilter(); fillActionFilter(); renderRows(); status.textContent = events.length ? '' : 'No hay eventos disponibles.';
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return;
        status.textContent = errorMessage(error); status.classList.add('error');
        body.replaceChildren(); const errorRow = body.insertRow(), errorCell = errorRow.insertCell(); errorCell.colSpan = 9; errorCell.textContent = errorMessage(error);
    }
}

void initializePage().then((context) => {
    if (!context) return;
    const content = $('global-history-content'); content.hidden = false;
    const role = context.session.rol as Role;
    if (!visible('historial', role, context.flags)) {
        $('history-access-denied').textContent = 'El módulo de historial no está habilitado para tu rol.';
        $('history-access-denied').hidden = false; content.hidden = true; return;
    }
    const descriptions: Record<Role, string> = { ADMIN: 'Consulta las acciones registradas en todos los tickets del sistema.', SUPERVISOR: 'Consulta el historial de tickets de los proyectos que supervisas.', AGENTE: 'Consulta el historial de los tickets que tienes asignados.', CLIENTE: 'Consulta el historial disponible de tus propios tickets.' };
    $('global-history-description').textContent = descriptions[role];
    $('history-company').addEventListener('change', () => { fillProjectFilter(); fillTicketFilter(); renderRows(); });
    $('history-project').addEventListener('change', () => { fillTicketFilter(); renderRows(); });
    $('history-ticket').addEventListener('change', renderRows); $('history-action').addEventListener('change', renderRows);
    $('global-history-clear').addEventListener('click', () => { ($('history-company') as HTMLSelectElement).value = ''; fillProjectFilter(); fillTicketFilter(); ($('history-action') as HTMLSelectElement).value = ''; renderRows(); });
    $('global-history-reload').addEventListener('click', () => void load());
    void load();
});
