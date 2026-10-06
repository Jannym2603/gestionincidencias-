import { api } from './http';
import { initializePage } from './page-layout';
import { loginRedirect } from './session';
interface Profile { nombre: string; apellido: string; correo: string; telefono?: string | null; rol: string }
interface Config { [key: string]: boolean }
const groups = [
    { name: 'Crear Ticket', key: 'crearTicket', description: 'Permite registrar nuevas incidencias.', roles: ['Cliente', 'Agente', 'Supervisor'] },
    { name: 'Solicitudes de Recursos', key: 'solicitudesRecursos', description: 'Permite consultar y dar seguimiento a recursos externos.', roles: ['Cliente', 'Agente', 'Supervisor'] },
    { name: 'Reportes', key: 'reportes', description: 'Permite consultar el módulo de reportes.', roles: ['Cliente', 'Agente', 'Supervisor'] },
    { name: 'Historial', key: 'historial', description: 'Permite consultar el historial general de movimientos.', roles: ['Cliente', 'Agente', 'Supervisor'] },
];
const $ = (id: string) => document.getElementById(id)!;
let config: Config = {};
function key(module: string, role?: string) { return role ? `${module}${role}` : module === 'reportes' ? 'reportesActivos' : `${module}Activo`; }
function setStatus(id: string, message: string, error = false) { const el = $(id); el.textContent = message; el.classList.toggle('error', error); el.classList.toggle('success', !error && !!message); }
function checkbox(field: string, label: string, value: boolean, global = false) {
    const wrap = document.createElement(global ? 'div' : 'label'); wrap.className = global ? 'modulo-global-linea' : 'feature-flag-card permiso-rol-card';
    const title = document.createElement('span'); title.textContent = label;
    const input = document.createElement('input'); input.type = 'checkbox'; input.id = `flag-${field}`; input.checked = value; input.dataset.field = field;
    const state = document.createElement('span'); state.className = `estado-switch ${value ? 'activo' : 'inactivo'}`; state.dataset.statusFor = field; state.textContent = value ? 'ACTIVO' : 'INACTIVO';
    if (global) { const control = document.createElement('label'); control.className = 'modulo-global-control'; control.append(input, Object.assign(document.createElement('span'), { className: 'feature-switch', ariaHidden: 'true' })); wrap.append(title, state, control); }
    else { const text = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = label; const desc = document.createElement('p'); desc.textContent = `Puede utilizar ${label.toLowerCase()}.`; text.append(strong, desc); wrap.replaceChildren(text, state, input, Object.assign(document.createElement('span'), { className: 'feature-switch', ariaHidden: 'true' })); }
    input.addEventListener('change', updateSwitchLabels); return wrap;
}
function renderSettings() {
    const root = $('settings-modules'); root.replaceChildren();
    for (const group of groups) {
        const article = document.createElement('article'); article.className = 'modulo-acordeon-item'; article.dataset.module = group.key;
        const head = document.createElement('button'); head.type = 'button'; head.className = 'modulo-acordeon-header'; head.setAttribute('aria-expanded', 'false');
        const name = document.createElement('strong'); name.textContent = group.name; const description = document.createElement('span'); description.textContent = group.description;
        const copy = document.createElement('div'); copy.append(name, description); const heading = document.createElement('div'); heading.append(copy);
        const arrow = document.createElement('span'); arrow.className = 'modulo-acordeon-chevron'; arrow.textContent = '⌄'; const summary = document.createElement('div'); summary.className = 'modulo-acordeon-resumen'; const globalState = document.createElement('span'); globalState.dataset.statusFor = key(group.key); globalState.className = `estado-switch ${config[key(group.key)] ? 'activo' : 'inactivo'}`; globalState.textContent = config[key(group.key)] ? 'ACTIVO' : 'INACTIVO'; summary.append(globalState, arrow); head.append(heading, summary);
        const panel = document.createElement('div'); panel.className = 'modulo-acordeon-panel';
        panel.append(checkbox(key(group.key), 'Activo globalmente', config[key(group.key)], true));
        const roles = document.createElement('div'); roles.className = 'permisos-roles-grid';
        for (const role of group.roles) roles.append(checkbox(key(group.key, role), role, config[key(group.key, role)]));
        panel.append(roles); head.addEventListener('click', () => { const open = article.classList.toggle('abierto'); head.setAttribute('aria-expanded', String(open)); }); article.append(head, panel); root.append(article);
    }
    root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((input) => input.addEventListener('change', updateSwitchLabels));
    $('settings-save').removeAttribute('disabled'); $('settings-reset').removeAttribute('disabled'); updateSwitchLabels();
}
function updateSwitchLabels() { document.querySelectorAll<HTMLElement>('[data-status-for]').forEach((label) => { const input = $(`flag-${label.dataset.statusFor}`) as HTMLInputElement; label.textContent = input.checked ? 'ACTIVO' : 'INACTIVO'; label.className = `estado-switch ${input.checked ? 'activo' : 'inactivo'}`; }); }
function payload(): Config { const result: Config = {}; $('settings-modules').querySelectorAll<HTMLInputElement>('input[data-field]').forEach((input) => { result[input.dataset.field!] = input.checked; }); return result; }
async function saveSettings(next: Config) {
    const button = $('settings-save') as HTMLButtonElement; button.disabled = true; setStatus('settings-form-status', 'Guardando cambios…');
    try { config = await api<Config>('configuracion-sistema', { method: 'PUT', body: next }); renderSettings(); setStatus('settings-form-status', 'Configuración guardada correctamente.'); }
    catch (error) { setStatus('settings-form-status', error instanceof Error ? error.message : 'No se pudo guardar la configuración.', true); }
    finally { button.disabled = false; }
}
async function initialize() {
    const initialized = await initializePage(); if (!initialized) return; $('settings-content').hidden = false;
    const fields = $('profile-fields');
    try { const profile = await api<Profile>('usuarios/me'); for (const [label, value] of [['Nombre completo', `${profile.nombre} ${profile.apellido}`.trim()], ['Correo', profile.correo], ['Teléfono', profile.telefono || '—'], ['Rol', profile.rol]]) { const item = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; item.append(dt, dd); fields.append(item); } }
    catch (error) { setStatus('settings-status', error instanceof Error ? error.message : 'No se pudo cargar el perfil.', true); }
    const admin = initialized.session.rol === 'ADMIN'; $('system-settings').hidden = !admin;
    if (admin) { try { config = await api<Config>('configuracion-sistema'); renderSettings(); } catch (error) { setStatus('settings-status', error instanceof Error ? error.message : 'No se pudo cargar la configuración del sistema.', true); } }
    if (!$('settings-status').classList.contains('error')) $('settings-status').textContent = '';
    $('settings-form').addEventListener('submit', (event) => { event.preventDefault(); void saveSettings(payload()); });
    $('settings-reset').addEventListener('click', () => { if (!confirm('¿Restablecer los módulos y permisos por rol?')) return; const allEnabled = Object.fromEntries(Object.keys(payload()).map((field) => [field, true])); renderSettingsFrom(allEnabled); });
    $('password-form').addEventListener('submit', (event) => { event.preventDefault(); void changePassword(); });
}
function renderSettingsFrom(next: Config) { config = next; renderSettings(); setStatus('settings-form-status', 'Valores predeterminados listos. Guarda los cambios para aplicarlos.'); }
async function changePassword() {
    const current = ($('password-current') as HTMLInputElement).value; const next = ($('password-new') as HTMLInputElement).value; const confirmNext = ($('password-confirm') as HTMLInputElement).value;
    if (next.length < 6) { setStatus('password-status', 'La nueva contraseña debe tener al menos 6 caracteres.', true); return; }
    if (current === next) { setStatus('password-status', 'La nueva contraseña debe ser diferente de la actual.', true); return; }
    if (next !== confirmNext) { setStatus('password-status', 'La nueva contraseña y la confirmación no coinciden.', true); return; }
    const button = $('password-submit') as HTMLButtonElement; button.disabled = true; setStatus('password-status', 'Actualizando contraseña…');
    try { await api('auth/cambiar-password', { method: 'POST', body: { passwordActual: current, nuevaPassword: next } }); ($('password-form') as HTMLFormElement).reset(); setStatus('password-status', 'Contraseña actualizada. Inicia sesión de nuevo.'); window.setTimeout(() => loginRedirect(), 1000); }
    catch (error) { setStatus('password-status', error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.', true); }
    finally { button.disabled = false; }
}
void initialize();
