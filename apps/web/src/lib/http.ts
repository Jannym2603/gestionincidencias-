import { getSession, loginRedirect } from './session';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export const API_URL = (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
async function request(path: string, options: { method?: string; body?: unknown; public?: boolean } = {}): Promise<Response> {
    const session = options.public ? null : getSession();
    if (!options.public && !session) { loginRedirect(true); throw new ApiError(401, 'Tu sesión ha expirado.'); }
    const headers = new Headers({ Accept: 'application/json' });
    if (session) headers.set('Authorization', `Bearer ${session.token}`);
    const multipart = options.body instanceof FormData;
    if (options.body !== undefined && !multipart) headers.set('Content-Type', 'application/json');
    let response: Response;
    try {
        // Proxy de desarrollo: permite integrar Nest sin modificar su CORS.
        response = await fetch(`${import.meta.env.DEV ? '' : API_URL}/api/${path.replace(/^\//, '')}`, {
            method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body), signal: AbortSignal.timeout(30000),
        });
    } catch { throw new ApiError(0, 'No se pudo conectar con el sistema. Inténtalo de nuevo.'); }
    if (!response.ok) {
        if (response.status === 401 && !options.public) loginRedirect(true);
        let data: unknown;
        try { data = await response.clone().json(); } catch { data = null; }
        const msg = data && typeof data === 'object' && 'message' in data ? (data as { message: unknown }).message : null;
        throw new ApiError(response.status, typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join('. ') : response.status === 403 ? 'No tienes permiso para acceder a esta información.' : 'No se pudo completar la operación.');
    }
    return response;
}
export async function api<T>(path: string, options: { method?: string; body?: unknown; public?: boolean } = {}): Promise<T> {
    const response = await request(path, options);
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; } catch { throw new ApiError(response.status, 'El sistema devolvió una respuesta no válida.'); }
}
export async function apiBlob(path: string): Promise<Blob> {
    return (await request(path)).blob();
}
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
    const response = await request(path, { method: 'POST', body: form });
    try { return await response.json() as T; } catch { throw new ApiError(response.status, 'El sistema devolvió una respuesta no válida.'); }
}
