import { api, ApiError } from './http';
import { node } from './admin-common';
import { initializePage } from './page-layout';
interface Entry { id: number; usuarioNombre?: string; usuarioCorreo?: string; fechaCambio?: string; modulo?: string | null; rol?: string | null; valorAnterior?: string | null; valorNuevo?: string | null; crearTicketAnterior?: boolean | null; crearTicketNuevo?: boolean | null; reportesAnterior?: boolean | null; reportesNuevo?: boolean | null; historialAnterior?: boolean | null; historialNuevo?: boolean | null }
const $ = (id: string) => document.getElementById(id)!;
const moduleNames: Record<string, string> = { CREAR_TICKET: 'Crear Ticket', SOLICITUDES_RECURSOS: 'Solicitudes de Recursos', REPORTES: 'Reportes', HISTORIAL: 'Historial' };
function date(value?: string) { if (!value) return 'Sin fecha'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Fecha inválida' : parsed.toLocaleString('es-PA'); }
function bool(value: unknown) { const normalized = String(value ?? '').trim().toLowerCase(); return normalized === 'true' ? 'Activo' : normalized === 'false' ? 'Inactivo' : String(value ?? '—'); }
function addChange(article: HTMLElement, module: string, role: string, before: unknown, after: unknown) {
    const line = node('div', '', 'audit-change-row'); const label = node('span', `${moduleNames[module.toUpperCase()] ?? module} · ${role === 'GLOBAL' ? 'Global' : role || 'Sin rol'}`); const values = node('div', '', 'audit-change-values'); values.append(node('strong', bool(before), 'audit-value previous'), node('span', '→'), node('strong', bool(after), 'audit-value current')); line.append(label, values); article.append(line);
}
function render(entries: Entry[]) {
    const root = $('audit-list'); root.replaceChildren();
    if (!entries.length) { root.append(node('p', 'Todavía no hay cambios registrados.', 'empty-message')); return; }
    for (const entry of [...entries].sort((a, b) => new Date(b.fechaCambio ?? 0).getTime() - new Date(a.fechaCambio ?? 0).getTime())) {
        const article = node('article', '', 'audit-item'); const header = node('div', '', 'audit-item-header'); const identity = node('div'); identity.append(node('strong', entry.usuarioNombre || 'Usuario'), node('small', entry.usuarioCorreo || 'Sin correo')); header.append(identity, node('time', date(entry.fechaCambio))); article.append(header);
        if (entry.modulo && entry.valorAnterior != null && entry.valorNuevo != null) addChange(article, entry.modulo, entry.rol || 'GLOBAL', entry.valorAnterior, entry.valorNuevo);
        else {
            let count = 0;
            for (const [module, oldField, newField] of [['CREAR_TICKET', 'crearTicketAnterior', 'crearTicketNuevo'], ['REPORTES', 'reportesAnterior', 'reportesNuevo'], ['HISTORIAL', 'historialAnterior', 'historialNuevo']] as const) {
                const before = entry[oldField], after = entry[newField]; if (before == null || after == null || before === after) continue; addChange(article, module, 'GLOBAL', before, after); count++;
            }
            if (!count) article.append(node('p', 'Registro histórico sin detalle por módulo o rol.', 'audit-no-change'));
        }
        root.append(article);
    }
}
async function load() {
    $('audit-status').textContent = 'Cargando historial…';
    try { const entries = await api<Entry[]>('configuracion-sistema/auditoria'); render(entries); $('audit-total').textContent = `${entries.length} ${entries.length === 1 ? 'cambio registrado' : 'cambios registrados'}`; $('audit-status').textContent = ''; }
    catch (error) {
        if (error instanceof ApiError && error.status === 403) { $('audit-content').hidden = true; $('audit-access-denied').hidden = false; $('audit-access-denied').textContent = error.message; return; }
        $('audit-status').textContent = error instanceof Error ? error.message : 'No se pudo cargar el historial.'; $('audit-status').classList.add('error');
    }
}
void (async () => { const context = await initializePage(); if (!context) return; if (context.session.rol !== 'ADMIN') { $('audit-access-denied').hidden = false; $('audit-access-denied').textContent = 'Solo ADMIN puede consultar la auditoría.'; return; } $('audit-content').hidden = false; $('audit-reload').addEventListener('click', () => void load()); await load(); })();
