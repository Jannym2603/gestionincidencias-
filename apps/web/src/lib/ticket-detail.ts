import { api, apiBlob, apiUpload, ApiError } from './http';
import { initializePage } from './page-layout';
import type { Session } from './session';

interface Ticket { id: number; numeroTicket?: string | null; titulo?: string | null; descripcion?: string | null; estado?: string | null; prioridad?: string | null; tipoIncidenciaNombre?: string | null; tipoAtencion?: string | null; clienteNombre?: string | null; agenteNombre?: string | null; agenteId?: number | null; companiaNombre?: string | null; proyectoNombre?: string | null; proyectoId?: number; fechaCreacion?: string | null; fechaActualizacion?: string | null; fechaCierre?: string | null; fechaLimiteRespuesta?: string | null; fechaPrimeraRespuesta?: string | null; slaRespuestaCumplido?: boolean | null; fechaLimiteResolucion?: string | null; fechaResolucion?: string | null; slaResolucionCumplido?: boolean | null }
interface Comment { id: number; nombreUsuario?: string | null; contenido: string; tipoComentario?: string | null; fechaCreacion?: string | null }
interface History { id: number; accion?: string | null; descripcion?: string | null; nombreUsuario?: string | null; fechaCreacion?: string | null }
interface Attachment { id: number; nombreArchivo: string; tipoArchivo?: string | null; tamanio?: number | null; fechaSubida?: string | null }
interface Resource { id: number; recurso?: string | null; proveedor?: string | null; estadoRecurso?: string | null; fechaSolicitudProveedor?: string | null; fechaEstimadaEntrega?: string | null; fechaRecepcion?: string | null; fechaEntregaCliente?: string | null; situacionEntrega?: string | null; diasRetraso?: number | null; motivoRetraso?: string | null; detalleRetraso?: string | null; observaciones?: string | null }
interface User { id: number; nombre: string; apellido: string; rol: string; estado: boolean }
interface ProjectAssignment { usuarioId: number; estado: boolean; usuarioNombre?: string }
const $ = (id: string) => document.getElementById(id)!;
const ticketId = location.pathname.split('/').filter(Boolean).at(-1) ?? '';
const message = $('detail-status');
let session: Session | null = null;
let ticket: Ticket | null = null;
let resource: Resource | null = null;
const date = (value?: string | null) => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-PA'); };
function put(id: string, value: unknown) { $(id).textContent = value == null || value === '' ? '—' : String(value); }
function feedback(id: string, value: string, error = false) { const el = $(id); el.textContent = value; el.classList.toggle('error', error); }
function renderTicket(t: Ticket) {
    ticket = t; put('ticket-number', t.numeroTicket || `Ticket #${t.id}`); put('ticket-title', t.titulo || 'Sin titulo'); put('ticket-description', t.descripcion || 'Sin descripcion'); put('ticket-state', t.estado); put('ticket-priority', t.prioridad); put('ticket-attention', (t.tipoAtencion || 'OPERATIVO').toUpperCase() === 'RECURSO_EXTERNO' ? 'Recurso externo' : 'Operativo');
    $('ticket-state').className = `badge ${({ NUEVO: 'badge-nuevo', ASIGNADO: 'badge-asignado', EN_PROGRESO: 'badge-progreso', RESUELTO: 'badge-resuelto', CERRADO: 'badge-cerrado' } as Record<string, string>)[t.estado || ''] || ''}`;
    $('ticket-priority').className = `badge ${({ P1_CRITICA: 'badge-prioridad-critica', P2_ALTA: 'badge-prioridad-alta', P3_MEDIA: 'badge-prioridad-media', P4_BAJA: 'badge-prioridad-baja' } as Record<string, string>)[t.prioridad || ''] || ''}`;
    put('ticket-type', t.tipoIncidenciaNombre); put('ticket-client', t.clienteNombre); put('ticket-agent', t.agenteNombre || 'Sin asignar'); put('ticket-company', t.companiaNombre); put('ticket-project', t.proyectoNombre); put('ticket-created', date(t.fechaCreacion)); put('ticket-updated', date(t.fechaActualizacion)); put('ticket-closed', date(t.fechaCierre)); put('ticket-response-sla', `${date(t.fechaPrimeraRespuesta)} · limite ${date(t.fechaLimiteRespuesta)} · ${t.slaRespuestaCumplido == null ? 'Pendiente' : t.slaRespuestaCumplido ? 'Cumplido' : 'Incumplido'}`); put('ticket-resolution-sla', (t.tipoAtencion || '').toUpperCase() === 'RECURSO_EXTERNO' ? 'No aplica a recursos externos' : `${date(t.fechaResolucion)} · limite ${date(t.fechaLimiteResolucion)} · ${t.slaResolucionCumplido == null ? 'Pendiente' : t.slaResolucionCumplido ? 'Cumplido' : 'Incumplido'}`); updateOpenTime(t);
}
function updateOpenTime(t: Ticket) { const start = t.fechaCreacion ? new Date(t.fechaCreacion).getTime() : NaN; const end = t.fechaCierre ? new Date(t.fechaCierre).getTime() : Date.now(); put('ticket-open-time', Number.isFinite(start) ? formatDuration(Math.max(0, end - start)) : '—'); if (!t.fechaCierre) window.setInterval(() => put('ticket-open-time', formatDuration(Math.max(0, Date.now() - start))), 60_000); }
function formatDuration(ms: number) { const mins = Math.floor(ms / 60000), days = Math.floor(mins / 1440), hours = Math.floor(mins % 1440 / 60); return `${days} dias, ${hours} horas`; }
function addItem(root: HTMLElement, title: string, body: string, by: string, at: string, kind?: string) { const card = document.createElement('article'); card.className = kind ?? 'ticket-comment-item'; const header = document.createElement('div'); header.className = kind === 'ticket-history-item' ? 'ticket-history-header' : 'ticket-comment-header'; const strong = document.createElement('strong'); strong.textContent = title; const small = document.createElement('small'); small.textContent = date(at); header.append(strong, small); const p = document.createElement('p'); p.textContent = body; const author = document.createElement('span'); author.textContent = by; card.append(header, p, author); root.append(card); }
async function loadComments() { const root = $('comments-list'); root.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Cargando comentarios...' })); try { const rows = await api<Comment[]>(`comentarios/ticket/${ticketId}`); root.replaceChildren(); if (!rows.length) { root.textContent = 'No hay comentarios registrados.'; return; } for (const c of rows) addItem(root, `${c.nombreUsuario || 'Usuario'} · ${c.tipoComentario || 'PUBLICO'}`, c.contenido, '', c.fechaCreacion || ''); } catch (error) { root.textContent = error instanceof Error ? error.message : 'No se pudieron cargar comentarios.'; root.classList.add('error'); } }
async function loadHistory() { const root = $('history-list'); try { const rows = await api<History[]>(`historial-tickets/ticket/${ticketId}`); root.replaceChildren(); if (!rows.length) { root.textContent = 'No hay historial registrado.'; return; } for (const h of rows) addItem(root, h.accion || 'Actualizacion', h.descripcion || '', h.nombreUsuario || 'Sistema', h.fechaCreacion || '', 'ticket-history-item'); $('history-status').textContent = ''; } catch (error) { if (error instanceof ApiError && error.status === 403) { $('history-section').hidden = true; return; } feedback('history-status', error instanceof Error ? error.message : 'No se pudo cargar el historial.', true); } }
async function loadAttachments() { const root = $('attachments-list') as HTMLTableSectionElement; try { const rows = await api<Attachment[]>(`adjuntos/ticket/${ticketId}`); root.replaceChildren(); if (!rows.length) { const tr = root.insertRow(), td = tr.insertCell(); td.colSpan = 5; td.textContent = 'Este ticket no tiene archivos adjuntos.'; return; } for (const file of rows) { const tr = root.insertRow(); for (const value of [file.nombreArchivo, file.tipoArchivo || 'Archivo', size(file.tamanio), date(file.fechaSubida)]) tr.insertCell().textContent = value; const cell = tr.insertCell(), button = document.createElement('button'); button.className = 'action-link'; button.textContent = 'Descargar'; button.addEventListener('click', () => void download(file)); cell.append(button); } } catch (error) { const tr = root.insertRow(), td = tr.insertCell(); td.colSpan = 5; td.textContent = error instanceof Error ? error.message : 'No se pudieron cargar los adjuntos.'; td.className = 'error'; } }
function size(value?: number | null) { if (!value) return '0 KB'; return value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(2)} MB`; }
async function loadResource() { if ((ticket?.tipoAtencion || '').toUpperCase() !== 'RECURSO_EXTERNO') return; const section = $('resource-section'); section.hidden = false; try { const row = await api<Resource>(`solicitudes-recursos/ticket/${ticketId}`); resource = Array.isArray(row) ? row[0] : row; if (!resource) { feedback('resource-status', 'Sin solicitud de recurso asociada.', true); return; } put('resource-name', resource.recurso); put('resource-provider', resource.proveedor); put('resource-state', resource.estadoRecurso); put('resource-delivery', date(resource.fechaEstimadaEntrega)); put('resource-delay', resource.situacionEntrega); put('resource-delay-days', resource.diasRetraso ?? 0); setupResourceActions(); } catch (error) { feedback('resource-status', error instanceof Error ? error.message : 'No se pudo consultar el recurso.', true); } }
async function download(file: Attachment) { try { const blob = await apiBlob(`adjuntos/${file.id}/descargar`); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = file.nombreArchivo; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); feedback('attachment-status', `Descargando ${file.nombreArchivo}.`); } catch (error) { feedback('attachment-status', error instanceof Error ? error.message : 'No se pudo descargar el archivo.', true); } }

const resourceTransitions: Record<string, string[]> = { NUEVO: ['EN_VALIDACION', 'CANCELADO'], EN_VALIDACION: ['SOLICITADO_PROVEEDOR', 'CANCELADO'], SOLICITADO_PROVEEDOR: ['ESPERANDO_PROVEEDOR', 'RECIBIDO', 'CANCELADO'], ESPERANDO_PROVEEDOR: ['RECIBIDO', 'CANCELADO'], RECIBIDO: ['ENTREGADO'], ENTREGADO: ['CERRADO'], CERRADO: [], CANCELADO: [] };
function localDate(value?: string | null) { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; const offset = d.getTimezoneOffset(); return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16); }
async function mutate(path: string, body: unknown, button: HTMLButtonElement, statusId = 'action-status') { button.disabled = true; feedback(statusId, 'Guardando cambios...'); try { await api(path, { method: 'PUT', body }); feedback(statusId, 'Cambios guardados. Actualizando ticket...'); location.reload(); } catch (error) { if (error instanceof ApiError && error.status === 401) return; feedback(statusId, error instanceof Error ? error.message : 'No se pudieron guardar los cambios.', true); button.disabled = false; } }
async function setupActions() {
    if (!ticket || !session) return;
    const admin = session.rol === 'ADMIN' || session.rol === 'SUPERVISOR';
    const agent = session.rol === 'AGENTE';
    const external = (ticket.tipoAtencion || '').toUpperCase() === 'RECURSO_EXTERNO';
    const section = $('ticket-actions');
    const assign = $('assignment-form') as HTMLFormElement;
    const state = $('state-form') as HTMLFormElement;
    const priority = $('priority-form') as HTMLFormElement;
    if (admin && ticket.proyectoId) {
        try {
            const [users, assignments] = await Promise.all([api<User[]>('usuarios'), api<ProjectAssignment[]>(`usuario-proyectos/proyecto/${ticket.proyectoId}`)]);
            const allowed = new Set(assignments.filter((a) => a.estado).map((a) => a.usuarioId));
            const agents = users.filter((u) => u.estado && u.rol === 'AGENTE' && allowed.has(u.id));
            const select = $('agent-select') as HTMLSelectElement;
            select.replaceChildren(new Option('Selecciona agente', ''), ...agents.map((u) => new Option(`${u.nombre} ${u.apellido}`, String(u.id))));
            if (agents.length) { assign.hidden = false; if (ticket.agenteId) select.value = String(ticket.agenteId); }
            assign.addEventListener('submit', (event) => { event.preventDefault(); const id = Number(select.value); if (id && ticket) void mutate(`tickets/${ticket.id}/asignar`, { agenteId: id }, $('assign-submit') as HTMLButtonElement); });
        } catch (error) { if (!(error instanceof ApiError && error.status === 403)) feedback('action-status', 'No se pudo cargar la lista de agentes permitidos.', true); }
    }
    if (!external && (admin || agent)) {
        const transitions: Record<string, string[]> = { NUEVO: ticket.agenteId ? ['EN_PROGRESO'] : [], ASIGNADO: ['EN_PROGRESO'], EN_PROGRESO: ['CERRADO'], RESUELTO: ['CERRADO'], CERRADO: [] };
        const allowed = transitions[ticket.estado || ''] || [];
        if (allowed.length) {
            const select = $('state-select') as HTMLSelectElement;
            select.replaceChildren(...allowed.map((value) => new Option(value.replaceAll('_', ' '), value)));
            if (allowed.includes('CERRADO')) { ($('close-note') as HTMLTextAreaElement).required = true; ($('close-note') as HTMLTextAreaElement).placeholder = 'Describe la solucion aplicada; es obligatoria para cerrar.'; ($('state-submit') as HTMLButtonElement).textContent = 'Cerrar ticket'; }
            state.hidden = false;
        } else if (ticket.estado === 'NUEVO' && !ticket.agenteId && (admin || agent)) {
            state.hidden = false; ($('state-select') as HTMLSelectElement).replaceChildren(new Option('Asigna un agente para iniciar', '')); ($('state-select') as HTMLSelectElement).disabled = true; ($('state-submit') as HTMLButtonElement).disabled = true;
            feedback('action-status', 'La primera asignacion mueve el ticket automaticamente a EN_PROGRESO.');
        }
        state.addEventListener('submit', (event) => { event.preventDefault(); const next = ($('state-select') as HTMLSelectElement).value; const note = ($('close-note') as HTMLTextAreaElement).value.trim(); if (!next || (next === 'CERRADO' && !note)) { feedback('action-status', 'Para cerrar el ticket debes agregar una nota de cierre.', true); return; } if (next === 'CERRADO' && !confirm('Confirmas el cierre de este ticket?')) return; void mutate(`tickets/${ticket!.id}/estado`, { estado: next, notaResolucion: note || undefined }, $('state-submit') as HTMLButtonElement); });
    }
    if (!external && (admin || agent)) {
        priority.hidden = false; ($('priority-select') as HTMLSelectElement).value = ticket.prioridad || 'P4_BAJA';
        priority.addEventListener('submit', (event) => { event.preventDefault(); const next = ($('priority-select') as HTMLSelectElement).value; void mutate(`tickets/${ticket!.id}/prioridad`, { prioridad: next, usuarioId: session!.id, justificacion: ($('priority-note') as HTMLInputElement).value.trim() || undefined }, $('priority-submit') as HTMLButtonElement); });
    }
    section.hidden = assign.hidden && state.hidden && priority.hidden;
}
function setupResourceActions() {
    if (!resource || !session || !['ADMIN', 'SUPERVISOR'].includes(session.rol)) return;
    const form = $('resource-form') as HTMLFormElement;
    form.hidden = false;
    ($('resource-provider-input') as HTMLInputElement).value = resource.proveedor || '';
    ($('resource-request-date') as HTMLInputElement).value = localDate(resource.fechaSolicitudProveedor);
    ($('resource-estimated-date') as HTMLInputElement).value = localDate(resource.fechaEstimadaEntrega);
    ($('resource-received-date') as HTMLInputElement).value = localDate(resource.fechaRecepcion);
    ($('resource-delivered-date') as HTMLInputElement).value = localDate(resource.fechaEntregaCliente);
    ($('resource-delay-reason') as HTMLInputElement).value = resource.motivoRetraso || '';
    ($('resource-delay-detail') as HTMLTextAreaElement).value = resource.detalleRetraso || '';
    ($('resource-observations') as HTMLTextAreaElement).value = resource.observaciones || '';
    const current = (resource.estadoRecurso || 'NUEVO').toUpperCase();
    const options = [current, ...(resourceTransitions[current] || [])];
    ($('resource-state-select') as HTMLSelectElement).replaceChildren(...options.map((value) => new Option(value.replaceAll('_', ' '), value)));
    form.addEventListener('submit', (event) => {
        event.preventDefault(); if (!resource) return;
        const dateValue = (id: string) => ($(id) as HTMLInputElement).value || null;
        const payload = { proveedor: ($('resource-provider-input') as HTMLInputElement).value.trim() || null, estadoRecurso: ($('resource-state-select') as HTMLSelectElement).value,
            fechaSolicitudProveedor: dateValue('resource-request-date'), fechaEstimadaEntrega: dateValue('resource-estimated-date'), fechaRecepcion: dateValue('resource-received-date'), fechaEntregaCliente: dateValue('resource-delivered-date'),
            motivoRetraso: ($('resource-delay-reason') as HTMLInputElement).value.trim() || null, detalleRetraso: ($('resource-delay-detail') as HTMLTextAreaElement).value.trim() || null, observaciones: ($('resource-observations') as HTMLTextAreaElement).value.trim() || null };
        const next = payload.estadoRecurso;
        if (['SOLICITADO_PROVEEDOR', 'ESPERANDO_PROVEEDOR', 'RECIBIDO', 'ENTREGADO', 'CERRADO'].includes(next) && !payload.proveedor) { feedback('resource-status', 'Indica el proveedor antes de avanzar la solicitud.', true); return; }
        if (next === 'ESPERANDO_PROVEEDOR' && !payload.fechaEstimadaEntrega) { feedback('resource-status', 'Indica la fecha estimada de entrega.', true); return; }
        if (next === 'CERRADO' && !payload.fechaEntregaCliente) { feedback('resource-status', 'Registra la fecha de entrega al cliente antes de cerrar.', true); return; }
        if (next !== current && next === 'CERRADO' && !confirm('La solicitud y el ticket se cerraran. Continuar?')) return;
        void mutate(`solicitudes-recursos/${resource.id}`, payload, $('resource-submit') as HTMLButtonElement, 'resource-status');
    });
}
function setupComment() { const form = $('comment-form') as HTMLFormElement, visibility = $('comment-visibility') as HTMLSelectElement, content = $('comment-content') as HTMLTextAreaElement, submit = $('comment-submit') as HTMLButtonElement; if (session?.rol === 'CLIENTE') { visibility.replaceChildren(new Option('Publico', 'PUBLICO')); visibility.disabled = true; } form.addEventListener('submit', async (event) => { event.preventDefault(); const value = content.value.trim(); if (!value || !session) return; submit.disabled = true; feedback('comment-status', 'Guardando comentario...'); try { await api('comentarios', { method: 'POST', body: { ticketId: Number(ticketId), usuarioId: session.id, contenido: value, tipoComentario: visibility.value } }); content.value = ''; feedback('comment-status', 'Comentario guardado.'); await Promise.all([loadComments(), loadHistory()]); } catch (error) { if (error instanceof ApiError && error.status === 401) return; feedback('comment-status', error instanceof Error ? error.message : 'No se pudo guardar el comentario.', true); } finally { submit.disabled = false; } }); }
function setupUpload() { const form = $('upload-form') as HTMLFormElement, input = $('attachment') as HTMLInputElement, button = $('upload-submit') as HTMLButtonElement; form.addEventListener('submit', async (event) => { event.preventDefault(); const file = input.files?.[0]; if (!file) return; const allowed = /\.(pdf|doc|docx|png|jpe?g|txt|xlsx?)$/i.test(file.name); if (!allowed || file.size > 10 * 1024 * 1024) { feedback('attachment-status', !allowed ? 'Tipo de archivo no permitido.' : 'El archivo supera el maximo de 10 MB.', true); return; } const data = new FormData(); data.append('archivo', file); button.disabled = true; feedback('attachment-status', 'Subiendo archivo...'); try { await apiUpload(`adjuntos/ticket/${ticketId}`, data); input.value = ''; feedback('attachment-status', 'Archivo subido correctamente.'); await loadAttachments(); } catch (error) { if (error instanceof ApiError && error.status === 401) return; feedback('attachment-status', error instanceof Error ? error.message : 'No se pudo subir el archivo.', true); } finally { button.disabled = false; } }); }
async function initialize() {
    if (!/^\d+$/.test(ticketId) || Number(ticketId) < 1) { feedback('detail-status', 'El ID de ticket no es válido.', true); return; }
    const initialized = await initializePage(); if (!initialized) return; session = initialized.session; setupComment(); setupUpload();
    try { const t = await api<Ticket>(`tickets/${encodeURIComponent(ticketId)}`); renderTicket(t); $('ticket-content').hidden = false; message.textContent = ''; setupActions(); await Promise.all([loadComments(), loadHistory(), loadAttachments(), loadResource()]); if (new URLSearchParams(location.search).get('adjunto') === 'error') feedback('attachment-status', 'Ticket creado, pero el archivo no se pudo subir. Puedes intentarlo de nuevo aqui.', true); }
    catch (error) { if (error instanceof ApiError && error.status === 401) return; feedback('detail-status', error instanceof ApiError && error.status === 403 ? 'No tienes acceso a este ticket.' : error instanceof Error ? error.message : 'No se pudo cargar el ticket.', true); }
}
void initialize();
