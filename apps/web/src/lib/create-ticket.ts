import { api, apiUpload, ApiError } from './http';
import { initializePage } from './page-layout';
import { visible, type Flags } from './navigation';
import type { Session } from './session';

interface Project { id: number; nombre: string; companiaId: number; companiaNombre?: string | null; estado?: boolean }
interface IncidentType { id: number; nombre: string; estado?: boolean }
interface User { id: number; nombre: string; apellido: string; rol: string; estado: boolean }
interface UserProject { proyectoId: number; estado: boolean }
interface TicketScope { clienteId: number; clienteNombre?: string | null; proyectoId: number }
interface CreatedTicket { id: number }
const $ = (id: string) => document.getElementById(id)!;
const form = $('create-ticket-form') as HTMLFormElement;
const status = $('create-status');
let session: Session | null = null;
let flags: Flags = {};
let projects: Project[] = [];
let availableProjects: Project[] = [];
let agentClientProjects = new Map<number, Set<number>>();

function message(value: string, error = false) { status.textContent = value; status.classList.toggle('error', error); }
function selectRows(id: string, rows: Array<{ id: number; label: string }>, empty: string) {
    const select = $(id) as HTMLSelectElement;
    select.replaceChildren(new Option(empty, ''), ...rows.map((row) => new Option(row.label, String(row.id))));
}
function allowedCreate() { return !!session && visible('crear-ticket', session.rol, flags); }
function syncType() {
    const external = ($('attention') as HTMLSelectElement).value === 'RECURSO_EXTERNO';
    $('resource-fields').toggleAttribute('hidden', !external);
    $('title-wrap').toggleAttribute('hidden', external);
    ($('title') as HTMLInputElement).required = !external;
    for (const id of ['resource-category', 'resource-name', 'resource-quantity']) ( $(id) as HTMLInputElement).required = external;
}
async function loadOptions() {
    if (!session) return;
    const [projectRows, types] = await Promise.all([
        api<Project[]>('proyectos'), api<IncidentType[]>('tipos-incidencia'),
    ]);
    availableProjects = projectRows.filter((p) => p.estado !== false);
    selectRows('incident-type', types.filter((t) => t.estado !== false).map((t) => ({ id: t.id, label: t.nombre })), 'Selecciona tipo');
    const customerSelect = $('customer') as HTMLSelectElement;
    if (session.rol === 'CLIENTE') {
        $('customer-wrap').hidden = true;
        customerSelect.required = false;
    } else if (['ADMIN', 'SUPERVISOR'].includes(session.rol)) {
        const users = await api<User[]>('usuarios');
        const customers = users.filter((u) => u.rol === 'CLIENTE' && u.estado);
        selectRows('customer', customers.map((u) => ({ id: u.id, label: `${u.nombre} ${u.apellido}` })), 'Selecciona cliente');
        customerSelect.required = true;
        $('project').toggleAttribute('disabled', true);
        selectRows('project', [], 'Selecciona primero un cliente');
        customerSelect.addEventListener('change', () => void loadCustomerProjects());
    } else {
        const scopedTickets = await api<TicketScope[]>('tickets');
        const customers = new Map<number, string>();
        agentClientProjects = new Map();
        for (const ticket of scopedTickets) {
            if (!ticket.clienteId || !ticket.proyectoId) continue;
            customers.set(ticket.clienteId, ticket.clienteNombre || `Cliente ${ticket.clienteId}`);
            const ids = agentClientProjects.get(ticket.clienteId) ?? new Set<number>(); ids.add(ticket.proyectoId); agentClientProjects.set(ticket.clienteId, ids);
        }
        selectRows('customer', [...customers].map(([id, label]) => ({ id, label })), 'Selecciona cliente de tickets asignados');
        customerSelect.required = true; $('project').toggleAttribute('disabled', true); selectRows('project', [], 'Selecciona primero un cliente');
        customerSelect.addEventListener('change', () => void loadCustomerProjects());
    }
    if (session.rol === 'CLIENTE') { projects = availableProjects; renderProjects('Selecciona proyecto'); }
}
function renderProjects(empty: string) {
    selectRows('project', projects.map((p) => ({ id: p.id, label: `${p.companiaNombre ? `${p.companiaNombre} / ` : ''}${p.nombre}` })), empty);
    ($('project') as HTMLSelectElement).disabled = projects.length === 0;
}
async function loadCustomerProjects() {
    if (!session || !['ADMIN', 'SUPERVISOR', 'AGENTE'].includes(session.rol)) return;
    const customerId = Number(($('customer') as HTMLSelectElement).value);
    if (!customerId) { projects = []; renderProjects('Selecciona primero un cliente'); return; }
    const projectSelect = $('project') as HTMLSelectElement;
    projectSelect.disabled = true; selectRows('project', [], 'Cargando proyectos autorizados...');
    try {
        const ids = session.rol === 'AGENTE' ? agentClientProjects.get(customerId) ?? new Set<number>()
            : new Set((await api<UserProject[]>(`usuario-proyectos/usuario/${customerId}`)).filter((a) => a.estado).map((a) => a.proyectoId));
        projects = availableProjects.filter((p) => ids.has(p.id));
        renderProjects(projects.length ? 'Selecciona proyecto' : 'El cliente no tiene proyectos compartidos contigo');
        if (!projects.length) message('El cliente no tiene proyectos compartidos contigo.', true);
        else message('');
    } catch (error) {
        projects = []; renderProjects('No se pudieron cargar proyectos');
        if (error instanceof ApiError && error.status === 401) return;
        message(error instanceof Error ? error.message : 'No se pudieron validar los proyectos del cliente.', true);
    }
}
function validateProjectCustomer(projectId: number, customerId: number) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error('Selecciona un proyecto disponible en tu alcance.');
    if (session?.rol !== 'CLIENTE' && !customerId) throw new Error('Selecciona el cliente del ticket.');
    return project;
}
async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!session) return;
    const button = $('create-submit') as HTMLButtonElement;
    const external = ($('attention') as HTMLSelectElement).value === 'RECURSO_EXTERNO';
    const projectId = Number(($('project') as HTMLSelectElement).value);
    const customerId = session.rol === 'CLIENTE' ? session.id : Number(($('customer') as HTMLSelectElement).value);
    let project: Project;
    try {
        project = validateProjectCustomer(projectId, customerId);
        if (!form.reportValidity()) return;
        const file = ($('ticket-file') as HTMLInputElement).files?.[0];
        if (file && (!/\.(pdf|doc|docx|png|jpe?g|txt|xlsx?)$/i.test(file.name) || file.size > 10 * 1024 * 1024)) throw new Error('El archivo debe tener un formato permitido y pesar como maximo 10 MB.');
        button.disabled = true;
        message('Creando ticket...');
        const resource = external ? {
            categoria: ($('resource-category') as HTMLSelectElement).value,
            recurso: ($('resource-name') as HTMLInputElement).value.trim(),
            cantidad: Number(($('resource-quantity') as HTMLInputElement).value),
            observaciones: ($('resource-notes') as HTMLInputElement).value.trim() || null,
        } : null;
        const created = await api<CreatedTicket>('tickets', { method: 'POST', body: {
            titulo: external ? `Solicitud de recurso - ${resource!.recurso}` : ($('title') as HTMLInputElement).value.trim(),
            descripcion: ($('description') as HTMLTextAreaElement).value.trim(),
            tipoAtencion: external ? 'RECURSO_EXTERNO' : 'OPERATIVO', solicitudRecurso: resource,
            tipoIncidenciaId: Number(($('incident-type') as HTMLSelectElement).value), clienteId: customerId,
            proyectoId: project.id, severidad: ($('severity') as HTMLSelectElement).value,
            criticidad: ($('criticality') as HTMLSelectElement).value,
            impacto: ($('impact') as HTMLSelectElement).value, urgencia: ($('urgency') as HTMLSelectElement).value,
        } });
        if (!created?.id) throw new Error('El ticket se creo, pero la respuesta no incluyo su identificador.');
        let attachmentError = false;
        if (file) {
            try { const data = new FormData(); data.append('archivo', file); await apiUpload(`adjuntos/ticket/${created.id}`, data); }
            catch { attachmentError = true; }
        }
        message(attachmentError ? 'Ticket creado. El archivo no se pudo subir; puedes intentarlo desde el detalle.' : 'Ticket creado correctamente.');
        location.assign(`/tickets/${created.id}${attachmentError ? '?adjunto=error' : ''}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) return;
        message(error instanceof Error ? error.message : 'No se pudo crear el ticket.', true);
    } finally { button.disabled = false; }
}
($('attention') as HTMLSelectElement).addEventListener('change', syncType);
form.addEventListener('submit', (event) => void submit(event));
void initializePage().then(async (result) => {
    if (!result) return;
    session = result.session; flags = result.flags;
    if (!allowedCreate()) { message('Tu rol no tiene habilitada la creacion de tickets.', true); form.hidden = true; return; }
    try { await loadOptions(); syncType(); message(''); }
    catch (error) { if (error instanceof ApiError && error.status === 401) return; message(error instanceof Error ? error.message : 'No se pudieron cargar los proyectos y tipos.', true); form.hidden = true; }
});
