import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const CARPETAS_ADJUNTOS_LEGACY = Symbol('CARPETAS_ADJUNTOS_LEGACY');
// src/adjuntos y dist/adjuntos están a la misma profundidad. No depende del cwd.
export function carpetasAdjuntos() {
    const primavera = fileURLToPath(new URL('../../../../uploads/adjuntos/', import.meta.url));
    const nest = fileURLToPath(new URL('../../uploads/adjuntos/', import.meta.url));
    return { principal: resolve(primavera), anteriores: [resolve(nest)] };
}
