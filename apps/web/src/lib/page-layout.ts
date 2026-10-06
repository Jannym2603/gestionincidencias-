import { api, ApiError } from './http';
import { getSession, loginRedirect, expiry } from './session';
import { visible, type Flags } from './navigation';
export async function initializePage() {
    const session = getSession(); if (!session) { loginRedirect(); return null; }
    try { await api('usuarios/me'); } catch (error) { if (error instanceof ApiError && error.status === 401) return null; const status = document.getElementById('list-status') ?? document.getElementById('detail-status'); if (status) { status.textContent = error instanceof Error ? error.message : 'No se pudo validar la sesión.'; status.classList.add('error'); } return null; }
    document.body.classList.add('sesion-lista');
    const identity: Record<string, string> = { nombreUsuario: session.nombre, rolUsuario: session.rol, avatarUsuario: session.nombre.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase(), 'dashboard-title': 'Tickets', 'dashboard-description': session.rol === 'ADMIN' ? 'Todos los tickets del sistema, organizados por cliente, compañía y proyecto.' : session.rol === 'SUPERVISOR' ? 'Tickets de tus proyectos, agrupados por cliente.' : session.rol === 'AGENTE' ? 'Tickets asignados a ti dentro de tus proyectos.' : 'Tus tickets en los proyectos a los que tienes acceso.' };
    for (const [id, value] of Object.entries(identity)) { const element = document.getElementById(id); if (element) element.textContent = value; }
    const app = document.getElementById('protected-app')!; app.hidden = false;
    document.getElementById('session-loading')!.hidden = true;
    document.getElementById('logout')!.addEventListener('click', () => loginRedirect());
    const toggle = document.querySelector<HTMLButtonElement>('#sidebar-toggle')!;
    if (localStorage.getItem('sidebarColapsada') === 'true' && innerWidth > 520) app.classList.add('sidebar-colapsada');
    const sync = () => { const collapsed = app.classList.contains('sidebar-colapsada'); toggle.textContent = collapsed ? '›' : '‹'; toggle.setAttribute('aria-expanded', String(!collapsed)); toggle.setAttribute('aria-label', collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'); };
    sync(); toggle.addEventListener('click', () => { app.classList.toggle('sidebar-colapsada'); localStorage.setItem('sidebarColapsada', String(app.classList.contains('sidebar-colapsada'))); sync(); });
    const validateExpiry = () => { if (!getSession()) loginRedirect(true); };
    setTimeout(validateExpiry, Math.max(0, Math.min(expiry(session.token) - Date.now(), 2147483647))); document.addEventListener('visibilitychange', () => { if (!document.hidden) validateExpiry(); });
    let flags: Flags = {}; try { flags = await api<Flags>('configuracion-sistema'); } catch (error) { if (error instanceof ApiError && error.status === 401) return null; }
    document.querySelectorAll<HTMLElement>('[data-menu]').forEach((element) => { element.hidden = !visible(element.dataset.menu!, session.rol, flags); });
    return { session, flags };
}
