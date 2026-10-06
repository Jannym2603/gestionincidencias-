import { api, ApiError } from './http';
import { getSession, saveSession, destination, type Session } from './session';
const error = document.querySelector<HTMLElement>('#login-error')!;
const form = document.querySelector<HTMLFormElement>('#loginForm')!;
const submit = document.querySelector<HTMLButtonElement>('#login-submit')!;
const password = document.querySelector<HTMLInputElement>('#password')!;
const existing = getSession();
if (existing) {
    submit.disabled = true;
    api('usuarios/me').then(() => location.replace(destination(existing.rol))).catch((e: unknown) => {
        if (!(e instanceof ApiError && e.status === 401)) { error.hidden = false; error.textContent = 'No se pudo validar tu sesión. Puedes volver a iniciar sesión.'; submit.disabled = false; }
    });
}
if (new URLSearchParams(location.search).get('sesion') === 'expirada') { error.hidden = false; error.textContent = 'Tu sesión ha expirado. Inicia sesión nuevamente.'; }
document.querySelector<HTMLButtonElement>('#toggle-password')!.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    password.type = password.type === 'password' ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(password.type === 'text')); button.setAttribute('aria-label', password.type === 'text' ? 'Ocultar contraseña' : 'Mostrar contraseña');
});
form.addEventListener('submit', async (event) => {
    event.preventDefault(); error.hidden = true; submit.disabled = true; submit.textContent = 'Iniciando sesión…';
    try {
        const correo = document.querySelector<HTMLInputElement>('#correo')!.value.trim().toLowerCase();
        const data = await api<Session>('auth/login', { method: 'POST', public: true, body: { correo, password: password.value.trim() } });
        saveSession(data); password.value = ''; location.replace(destination(data.rol));
    } catch (e) { error.textContent = e instanceof Error ? e.message : 'No se pudo iniciar sesión.'; error.hidden = false; }
    finally { submit.disabled = false; submit.textContent = 'Entrar al sistema'; }
});
