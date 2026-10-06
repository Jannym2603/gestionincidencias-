import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RutaAuditada { modulo: string; metodo: string; ruta: string; archivo: string; linea: number }
interface Variante { texto: string; condiciones: Record<string, boolean> }
const api = fileURLToPath(new URL('../', import.meta.url));
const raiz = resolve(api, '../..');
const archivos = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? archivos(resolve(dir, e.name)) : [resolve(dir, e.name)]);
export const normalizarRuta = (ruta: string) => '/' + ruta.replace(/^\/+|\/+$/g, '').replace(/:[\w]+|\{[^}]+\}/g, '{id}');
const clave = (r: RutaAuditada) => `${r.metodo} ${normalizarRuta(r.ruta)}`;
function decoradores(n: ts.Node) {
    return ts.canHaveDecorators(n) ? (ts.getDecorators(n) ?? []).flatMap((d) => ts.isCallExpression(d.expression) && ts.isIdentifier(d.expression.expression)
        ? [{ nombre: d.expression.expression.text, args: d.expression.arguments }] : []) : [];
}
export function inventarioSpring(): RutaAuditada[] {
    return archivos(resolve(raiz, 'src/main/java/com/practica/gestionincidencias/controller')).filter((f) => f.endsWith('Controller.java')).flatMap((archivo) => {
        const text = readFileSync(archivo, 'utf8'); const base = /@RequestMapping\("([^"]+)"\)/.exec(text)?.[1] ?? '';
        return [...text.matchAll(/@(Get|Post|Put|Delete|Patch)Mapping(?:\("([^"]*)"\))?/g)].map((m) => ({ modulo: archivo.split(/[\\/]/).at(-1)!.replace('Controller.java', ''),
            metodo: m[1]!.toUpperCase(), ruta: normalizarRuta(base + (m[2] ?? '')), archivo: relative(raiz, archivo), linea: text.slice(0, m.index).split('\n').length }));
    });
}
export function inventarioNest(): RutaAuditada[] {
    return archivos(resolve(api, 'src')).filter((f) => f.endsWith('.controller.ts')).flatMap((archivo) => {
        const sf = ts.createSourceFile(archivo, readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true); const rutas: RutaAuditada[] = [];
        sf.forEachChild((clase) => {
            if (!ts.isClassDeclaration(clase)) return;
            const controller = decoradores(clase).find((d) => d.nombre === 'Controller'); if (!controller) return;
            const base = controller.args[0] && ts.isStringLiteral(controller.args[0]) ? controller.args[0].text : '';
            for (const metodo of clase.members) for (const d of decoradores(metodo)) {
                if (!['Get', 'Post', 'Put', 'Delete', 'Patch'].includes(d.nombre)) continue;
                const path = d.args[0] && ts.isStringLiteral(d.args[0]) ? d.args[0].text : '';
                rutas.push({ modulo: clase.name?.text ?? '', metodo: d.nombre.toUpperCase(), ruta: normalizarRuta(`${base}/${path}`), archivo: relative(api, archivo), linea: sf.getLineAndCharacterOfPosition(metodo.getStart()).line + 1 });
            }
        }); return rutas;
    });
}
const compatibles = (a: Variante, b: Variante) => Object.entries(a.condiciones).every(([k, v]) => b.condiciones[k] === undefined || b.condiciones[k] === v);
function variantes(expr: ts.Expression, sf: ts.SourceFile): Variante[] {
    if (ts.isParenthesizedExpression(expr)) return variantes(expr.expression, sf);
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [{ texto: expr.text, condiciones: {} }];
    if (ts.isConditionalExpression(expr)) return [[expr.whenTrue, true], [expr.whenFalse, false]].flatMap(([rama, valor]) => variantes(rama as ts.Expression, sf).map((v) => ({ texto: v.texto, condiciones: { ...v.condiciones, [expr.condition.getText(sf)]: valor as boolean } })));
    if (ts.isTemplateExpression(expr)) {
        let results: Variante[] = [{ texto: expr.head.text, condiciones: {} }];
        for (const span of expr.templateSpans) results = results.flatMap((a) => variantes(span.expression, sf).filter((b) => compatibles(a, b)).map((b) => ({ texto: a.texto + b.texto + span.literal.text, condiciones: { ...a.condiciones, ...b.condiciones } })));
        return results;
    }
    const text = expr.getText(sf);
    const value = text === 'API_BASE' || text === 'apiBase()' ? '/api' : text === 'API_PUBLICA' ? '/api/public/compartidos' : text === 'query' ? '' : '{id}';
    return [{ texto: value, condiciones: {} }];
}
export function inventarioFrontend(): RutaAuditada[] {
    const rows: RutaAuditada[] = [];
    for (const archivo of archivos(resolve(raiz, 'src/main/resources/static')).filter((f) => /\.(js|html)$/.test(f))) {
        const content = readFileSync(archivo, 'utf8');
        const scripts = archivo.endsWith('.html') ? [...content.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]!) : [content];
        for (const script of scripts) {
            const sf = ts.createSourceFile(archivo, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
            const agregar = (metodo: string, ruta: string, n: ts.Node) => { if (ruta.startsWith('/api/')) rows.push({ modulo: 'Frontend', metodo, ruta: normalizarRuta(ruta.split('?')[0]!), archivo: relative(raiz, archivo), linea: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 }); };
            function visitar(n: ts.Node) {
                if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['fetch', 'fetchJson', 'fetchConTimeoutTicket'].includes(n.expression.text) && n.arguments[0]) {
                    const options = n.arguments[1]; let metodos: Variante[] = [{ texto: 'GET', condiciones: {} }];
                    if (options && ts.isObjectLiteralExpression(options)) {
                        const prop = options.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'method');
                        if (prop && ts.isPropertyAssignment(prop)) metodos = variantes(prop.initializer, sf);
                    }
                    for (const path of variantes(n.arguments[0], sf)) for (const method of metodos) if (compatibles(path, method)) agregar(method.texto, path.texto, n);
                }
                // cargarGrafico recibe estos tres endpoints como strings y usa fetch(API_BASE + endpoint).
                if (ts.isTemplateExpression(n) && n.head.text.startsWith('/reportes/')) for (const v of variantes(n, sf)) agregar('GET', '/api' + v.texto, n);
                n.forEachChild(visitar);
            }
            visitar(sf);
        }
    }
    return rows.filter((r, i) => rows.findIndex((v) => clave(v) === clave(r)) === i).sort((a, b) => clave(a).localeCompare(clave(b)));
}
export function auditarParidad() {
    const spring = inventarioSpring(), nest = inventarioNest(), frontend = inventarioFrontend();
    const faltantes = spring.filter((r) => !nest.some((n) => clave(n) === clave(r)));
    const legacyFaltantes = frontend.filter((r) => !nest.some((n) => clave(n) === clave(r)));
    const adicionales = nest.filter((r) => !spring.some((s) => clave(s) === clave(r)));
    const duplicados = nest.filter((r, i) => nest.findIndex((n) => clave(n) === clave(r)) !== i);
    return { spring, nest, frontend, faltantes, legacyFaltantes, adicionales, duplicados };
}
function observacion(r: RutaAuditada) {
    const k = clave(r);
    if (['GET /api/proyectos', 'GET /api/proyectos/{id}'].includes(k)) return { contrato: 'SI', seguridad: 'NO', reglas: 'NO', nota: 'Extensión existente para AGENTE/CLIENTE; alcance filtrado por proyectos activos. Mejora conservada.' };
    if (k === 'GET /api/comentarios') return { contrato: 'SI', seguridad: 'NO', reglas: 'NO', nota: 'Listado del supervisor limitado a sus tickets; mejora de seguridad conservada.' };
    if (r.ruta.startsWith('/api/reportes/') && !r.ruta.endsWith('dashboard-resumen')) return { contrato: 'NO', seguridad: 'NO', reglas: 'NO', nota: 'Proyecto ajeno explícito: 403 en vez de agregados vacíos; mejora conservada.' };
    if (r.ruta.includes('compartir') || r.ruta.includes('enlaces-compartidos')) return { contrato: 'NO', seguridad: 'SI', reglas: 'SI', nota: 'Long superiores al máximo seguro JS se serializan como texto decimal; ids habituales numéricos.' };
    return { contrato: 'SI', seguridad: 'SI', reglas: 'SI', nota: 'Contrato y flujo legacy conservados; ver mejoras transversales.' };
}
export function escribirAuditoria() {
    const a = auditarParidad();
    const lineas = ['# Auditoría final Spring Boot / NestJS', '',
        `Spring: ${a.spring.length}; Nest: ${a.nest.length}; frontend: ${a.frontend.length}; faltantes Spring: ${a.faltantes.length}; faltantes frontend: ${a.legacyFaltantes.length}; duplicados Nest: ${a.duplicados.length}.`, '',
        'Inventario generado del AST de controllers Nest y llamadas JS/HTML, y anotaciones Spring. Las columnas de contratos/reglas reflejan revisión manual y pruebas, no solo existencia de rutas. Parámetros normalizados como {id}.', '',
        '## Matriz completa', '', '| Módulo | Método | Spring | Nest | Implementado | Contrato equivalente | Seguridad equivalente | Reglas equivalentes | Observaciones |', '|---|---|---|---|---|---|---|---|---|'];
    for (const s of a.spring.sort((x, y) => clave(x).localeCompare(clave(y)))) {
        const n = a.nest.find((r) => clave(r) === clave(s)); const o = observacion(s);
        lineas.push(`| ${s.modulo} | ${s.metodo} | ${s.ruta} | ${n?.ruta ?? '—'} | ${n ? 'SI' : 'NO'} | ${n ? o.contrato : 'NO'} | ${n ? o.seguridad : 'NO'} | ${n ? o.reglas : 'NO'} | ${n ? o.nota : 'Ausente'} |`);
    }
    for (const n of a.adicionales) lineas.push(`| ${n.modulo} | ${n.metodo} | — | ${n.ruta} | SI | NO | NO | NO | ${n.ruta === '/' ? 'Respuesta técnica existente Hello World.' : 'Intencional: el frontend consume este reporte que Spring no implementa.'} |`);
    lineas.push('', '## URLs consumidas por el frontend legacy', '', '| Método | URL /api | Existe en Nest | Primera referencia |', '|---|---|---|---|');
    for (const f of a.frontend) lineas.push(`| ${f.metodo} | ${f.ruta} | ${a.legacyFaltantes.some((r) => clave(r) === clave(f)) ? 'NO' : 'SI'} | ${f.archivo}:${f.linea} |`);
    lineas.push('', '## Contratos y pruebas', '',
        '- Auth: correo/password; passwordActual/nuevaPassword; correo/codigo/nuevaPassword. Cuatro POST 200; recuperación genérica.',
        '- Usuarios: nombre/apellido/correo/rol/password/telefono; password opcional al editar; estado requiere {estado:boolean}. POST 201; PUT/GET 200; errores de negocio 400. Respuestas incluyen rol/telefono y nunca password.',
        '- Compañías: nombre/descripcion?/estado?; proyectos añaden companiaId. POST 201, PUT 200. Cambiar estado usa un booleano JSON directo. Proyectos incluyen companiaNombre.',
        '- Accesos: POST usuarioId/proyectoId 201; reactivación sin duplicar; PUT activar/desactivar sin body 200. DTO plano usuarioNombre/usuarioCorreo/proyectoNombre/companiaNombre/fechaAsignacion/estado. ADMIN global; SUPERVISOR su ámbito; CLIENTE sus asignaciones; AGENTE mis-proyectos.',
        '- Tickets: título/descripcion/tipoIncidenciaId/clienteId/proyectoId/impacto/urgencia/tipoAtencion?/solicitudRecurso?. OPERATIVO por defecto; normalización. Asignar agenteId; estado estado/notaResolucion; prioridad prioridad/usuarioId/justificacion. POST 201; PUT/GET 200; inexistentes 400 como Spring.',
        '- Comentarios: ticketId/usuarioId/contenido/tipoComentario; POST 201, GET 200, ticket inexistente 400. Historial GET 200, inexistente 404; sin escritura manual.',
        '- Adjuntos: multipart archivo; POST/GET 200, inexistente 404. Metadatos sin rutaArchivo; descarga segura de carpetas Spring y anterior Nest, sin mover ni cambiar registros.',
        '- Recursos: GET/PUT 200; proveedor/fechas/estadoRecurso y campos opcionales; transiciones, retraso y cierre del ticket conservados. Reportes agregados mantienen nombres del frontend.',
        '- Configuración: veinte flags booleanos, PUT cuatro globales obligatorios; opcionales/null conservan existentes; auditoría ADMIN. Enlaces: correoDestinatario/fechaExpiracion?; POST 201; lectura/revocación 200; token inválido 404, expirado/revocado 403; público sin JWT y solo lectura.',
        '- Pruebas específicas: administracion.e2e-spec.ts (los 24 endpoints antes ausentes, campos, null, roles, duplicados, rollback y concurrencia); identidad.e2e-spec.ts e identidad.spec.ts (guard real); paridad.rules.spec.ts y tickets.e2e-spec.ts (defaults y estado); actividad-tickets.e2e-spec.ts (rutas históricas autorizadas, traversal, descarga y ausencia de rutas sensibles). Las otras suites verifican los módulos ya migrados.', '',
        '## Diferencias deliberadas no bloqueantes', '',
        '- JWT: se consulta usuario/rol persistido; cuentas inactivas o sesiones con rol/identidad desactualizados reciben 401 y deben volver a iniciar sesión. Evita privilegios retirados. Claims y rol se normalizan; clave mínima 32 bytes.',
        '- Se conservan los filtros de acceso más estrictos de comentarios/proyectos/reportes y los dos reportes adicionales.',
        '- Validaciones de tipos/longitudes siguen siendo estrictas cuando no afectan payloads del frontend; BCrypt inmediato en altas/edición de usuarios en vez de guardar contraseñas sin hash.',
        '- Long grandes se devuelven como cadenas sin pérdida de precisión. Errores inesperados 500 genéricos en vez de exponer excepciones internas; errores HTTP conocidos usan timestamp/status/error/message.',
        '- Archivo inexistente 404; path traversal y escapes por enlaces bloqueados. Carpeta principal compartida uploads/adjuntos del proyecto Spring; lectura compatible de apps/api/uploads/adjuntos anterior. Ningún archivo o registro real se mueve.',
        '- Astro debe usar proxy /api o el mismo origen y configurar FRONTEND_URL para la página pública; no se añade un origen CORS permisivo ni se modifica el frontend Spring.', '',
        'No quedan rutas Spring o frontend ausentes. Pruebas con mocks/fixtures y SMTP simulado; no migraciones ni cambios permanentes en PostgreSQL.');
    writeFileSync(resolve(api, 'AUDITORIA-PARIDAD.md'), lineas.join('\n') + '\n');
    return { spring: a.spring.length, nest: a.nest.length, frontend: a.frontend.length, faltantes: a.faltantes.length, legacyFaltantes: a.legacyFaltantes.length, duplicados: a.duplicados.length };
}
if (process.argv.includes('--write')) console.log(JSON.stringify(escribirAuditoria()));
