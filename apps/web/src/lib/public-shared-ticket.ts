import { api, ApiError } from './http';
interface SharedTicket { numeroTicket: string; titulo: string; descripcion: string; estado: string; prioridad: string; categoria: string; nombreCliente: string; nombreAgente: string; fechaCreacion: string; fechaExpiracion?: string | null; puedeVer: boolean; puedeComentar: boolean; puedeVerAdjuntos: boolean; puedeSubirAdjuntos: boolean; puedeCambiarEstado: boolean }
const $ = (id: string) => document.getElementById(id)!;
function date(value?: string | null) { if (!value) return 'Sin vencimiento'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('es-PA'); }
function text(id: string, value: unknown) { $(id).textContent = value == null || value === '' ? '—' : String(value); }
function fail(message: string) { $('public-loading').hidden = true; $('public-ticket').hidden = true; $('public-error').hidden = false; text('public-error-message', message); }
async function initialize() {
    const token = new URLSearchParams(location.search).get('token')?.trim();
    if (!token) { fail('El enlace no contiene un token válido.'); return; }
    try {
        const ticket = await api<SharedTicket>(`public/compartidos/${encodeURIComponent(token)}`, { public: true });
        $('public-loading').hidden = true;
        text('public-number', ticket.numeroTicket || 'Ticket'); text('public-title', ticket.titulo || 'Sin título'); text('public-description', ticket.descripcion || 'Sin descripción disponible.');
        text('public-priority', ticket.prioridad); text('public-category', ticket.categoria); text('public-client', ticket.nombreCliente); text('public-agent', ticket.nombreAgente); text('public-created', date(ticket.fechaCreacion)); text('public-expiry', date(ticket.fechaExpiracion));
        const state = $('public-state'); state.textContent = String(ticket.estado || 'NUEVO').replaceAll('_', ' '); state.className = `badge ${({ NUEVO: 'badge-nuevo', ASIGNADO: 'badge-asignado', EN_PROGRESO: 'badge-progreso', RESUELTO: 'badge-resuelto', CERRADO: 'badge-cerrado' } as Record<string, string>)[ticket.estado] ?? 'badge-nuevo'}`;
        $('public-ticket').hidden = false;
    } catch (error) {
        const message = error instanceof ApiError && error.status === 404 ? 'El enlace compartido no existe o no es válido.' : error instanceof ApiError && error.status === 403 ? error.message : error instanceof Error ? error.message : 'No se pudo abrir el ticket compartido.';
        fail(message);
    }
}
void initialize();
