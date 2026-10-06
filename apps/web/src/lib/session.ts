export const ROLES = ['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'] as const;
export type Role = typeof ROLES[number];
export interface Session { id: number; nombre: string; rol: Role; token: string }
const KEY = 'usuarioSistema';
export function expiry(token: string): number {
    try { const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))); return typeof payload.exp === 'number' ? payload.exp * 1000 : 0; } catch { return 0; }
}
export function clearSession() { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); }
export function saveSession(value: Session) {
    if (!ROLES.includes(value.rol) || !Number.isInteger(value.id) || !value.nombre || expiry(value.token) <= Date.now()) throw new Error('La respuesta de sesión no es válida.');
    clearSession();
    sessionStorage.setItem(KEY, JSON.stringify({ id: value.id, nombre: value.nombre, rol: value.rol, token: value.token }));
}
export function getSession(): Session | null {
    try {
        const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null;
        if (value && ROLES.includes(value.rol) && Number.isInteger(value.id) && typeof value.nombre === 'string' && expiry(value.token) > Date.now()) return value;
    } catch { /* Una sesión dañada nunca permite entrar. */ }
    clearSession(); return null;
}
export function loginRedirect(expired = false) { clearSession(); location.replace(expired ? '/login?sesion=expirada' : '/login'); }
// El payload se lee solo para expiración; la API verifica firma, identidad y permisos.
export function destination(_role: Role) { return '/dashboard'; }
