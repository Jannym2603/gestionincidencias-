import { api, ApiError } from './http';
import { initializePage } from './page-layout';
import { loginRedirect } from './session';
interface Ticket { id: number; numeroTicket?: string | null; titulo?: string | null; estado?: string | null; prioridad?: string | null; tipoAtencion?: string | null; tipoIncidenciaId?: number; tipoIncidenciaNombre?: string | null; clienteId?: number; clienteNombre?: string | null; agenteId?: number | null; agenteNombre?: string | null; companiaId?: number | null; companiaNombre?: string | null; proyectoId?: number | null; proyectoNombre?: string | null; fechaCreacion?: string | null }
const ids = ['ticket-search', 'filter-company', 'filter-project', 'filter-kind', 'filter-attention', 'filter-state', 'filter-priority', 'filter-customer'];
const status = document.getElementById('list-status')!; let tickets: Ticket[] = []; let loading = false;
function fillSelect(id: string, values: Map<string, string>, placeholder: string) { const select = document.getElementById(id) as HTMLSelectElement; const current = select.value; select.replaceChildren(new Option(placeholder, ''), ...[...values].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([key, label]) => new Option(label, key))); if (values.has(current)) select.value = current; }
function applyFilters() {
    const q = (document.getElementById('ticket-search') as HTMLInputElement).value.trim().toLocaleLowerCase('es');
    const [company, project, kind, attention, state, priority, customer] = ids.slice(1).map((id) => (document.getElementById(id) as HTMLSelectElement).value);
    const filtered = tickets.filter((t) => (!company || String(t.companiaId ?? '') === company) && (!project || String(t.proyectoId ?? '') === project) && (!kind || String(t.tipoIncidenciaId ?? '') === kind) && (!attention || (t.tipoAtencion || 'OPERATIVO').toUpperCase() === attention) && (!state || t.estado === state) && (!priority || t.prioridad === priority) && (!customer || String(t.clienteId ?? '') === customer) && (!q || [t.numeroTicket, t.titulo, t.clienteNombre, t.agenteNombre, t.companiaNombre, t.proyectoNombre, t.tipoIncidenciaNombre].some((v) => String(v ?? '').toLocaleLowerCase('es').includes(q))));
    const body = document.getElementById('tickets-body') as HTMLTableSectionElement; body.replaceChildren();
    if (!filtered.length) { const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 11; cell.textContent = tickets.length ? 'Ningún ticket coincide con los filtros.' : 'No hay tickets registrados en tu alcance.'; document.getElementById('ticket-count')!.textContent = '0 tickets'; return; }
    for (const ticket of filtered) {
        const row = body.insertRow();
        for (const value of [ticket.numeroTicket || `#${ticket.id}`, ticket.titulo || 'Sin título', ticket.companiaNombre || '—', ticket.proyectoNombre || '—', (ticket.tipoAtencion || 'OPERATIVO') === 'RECURSO_EXTERNO' ? 'RECURSO EXTERNO' : 'OPERATIVO', ticket.clienteNombre || '—', ticket.agenteNombre || 'Sin asignar', ticket.estado || '—', ticket.prioridad || '—', formatDate(ticket.fechaCreacion)]) { const cell = row.insertCell(); cell.textContent = value; }
        const action = row.insertCell(); const link = document.createElement('a'); link.className = 'action-link'; link.href = `/tickets/${encodeURIComponent(String(ticket.id))}`; link.textContent = 'Ver detalle'; action.append(link);
    }
    document.getElementById('ticket-count')!.textContent = `${filtered.length} de ${tickets.length} tickets`;
}
function formatDate(value?: string | null) { if (!value) return 'Sin fecha'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-PA'); }
async function load() {
    if (loading) return; loading = true; status.textContent = 'Cargando tickets…'; status.classList.remove('error'); const body = document.getElementById('tickets-body') as HTMLTableSectionElement; body.replaceChildren(); const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = 11; cell.textContent = 'Cargando tickets…';
    try {
        const data = await api<Ticket[]>('tickets'); if (!Array.isArray(data)) throw new Error('La API devolvió una lista no válida.'); tickets = data;
        fillSelect('filter-company', new Map(tickets.filter((t) => t.companiaId != null).map((t) => [String(t.companiaId), t.companiaNombre || `Compañía ${t.companiaId}`])), 'Todas las compañías');
        fillSelect('filter-project', new Map(tickets.filter((t) => t.proyectoId != null).map((t) => [String(t.proyectoId), t.proyectoNombre || `Proyecto ${t.proyectoId}`])), 'Todos los proyectos');
        fillSelect('filter-kind', new Map(tickets.filter((t) => t.tipoIncidenciaId != null).map((t) => [String(t.tipoIncidenciaId), t.tipoIncidenciaNombre || `Tipo ${t.tipoIncidenciaId}`])), 'Todos');
        const customers = new Map(tickets.filter((t) => t.clienteId != null).map((t) => [String(t.clienteId), t.clienteNombre || `Cliente ${t.clienteId}`]));
        fillSelect('filter-customer', customers, 'Todos los clientes'); document.getElementById('customer-filter-wrap')!.hidden = customers.size < 2;
        const projectId = new URLSearchParams(location.search).get('proyectoId'); if (projectId && tickets.some((t) => String(t.proyectoId) === projectId)) (document.getElementById('filter-project') as HTMLSelectElement).value = projectId;
        status.textContent = tickets.length ? '' : 'No hay tickets registrados en tu alcance.'; applyFilters();
    } catch (error) { if (error instanceof ApiError && error.status === 401) return; status.classList.add('error'); status.textContent = error instanceof Error ? error.message : 'No se pudieron cargar los tickets.'; const retry = document.createElement('button'); retry.className = 'secondary-btn'; retry.textContent = 'Reintentar'; retry.onclick = () => { void load(); }; status.append(' ', retry); }
    finally { loading = false; }
}
for (const id of ids) document.getElementById(id)!.addEventListener(id === 'ticket-search' ? 'input' : 'change', applyFilters);
void initializePage().then((result) => { if (result) void load(); else if (!document.getElementById('protected-app')!.hidden && !status.textContent) loginRedirect(); });
