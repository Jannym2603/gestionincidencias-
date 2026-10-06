import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { AdministracionRepository } from '../src/administracion/administracion.repository.js';
import type { UsuarioAdmin, UsuarioNuevo, ProyectoAdmin, ProyectoNuevo, CompaniaNueva, AsignacionNueva, AsignacionAdmin } from '../src/administracion/administracion.repository.js';
type Compania = Awaited<ReturnType<AdministracionRepository['companias']>>[number];
type Rol = Awaited<ReturnType<AdministracionRepository['roles']>>[number];
type UsuarioRol = Awaited<ReturnType<AdministracionRepository['rolesUsuario']>>[number];
interface Fixture {
    repo: { [K in keyof AdministracionRepository]: Mock };
    usuarios: UsuarioAdmin[]; companias: Compania[]; proyectos: ProyectoAdmin[];
    roles: Rol[]; relaciones: UsuarioRol[]; accesos: AsignacionAdmin[];
}
export function administracionFixture(): Fixture {
    const ahora = Temporal.Now.plainDateTimeISO();
    const roles = ['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].map((nombre, i) => ({ id: i + 1, nombre, descripcion: null })) as Rol[];
    const usuarios = [[30, 'ADMIN'], [31, 'SUPERVISOR'], [20, 'AGENTE'], [10, 'CLIENTE']].map(([id, rol]) => ({ id, nombre: rol, apellido: 'Prueba', correo: `${String(rol).toLowerCase()}@example.test`, telefono: null,
        password: 'hash-solo-fixture', estado: true, fechaCreacion: ahora })) as unknown as UsuarioAdmin[];
    const companias = [1, 2].map((id) => ({ id, nombre: `Compañía ${id}`, descripcion: null, estado: id === 1, fechaCreacion: ahora, fechaActualizacion: ahora })) as Compania[];
    const proyectos = [1, 2, 3, 4].map((id) => ({ id, nombre: `Proyecto ${id}`, descripcion: null, estado: id !== 3, companiaId: id === 4 ? 2 : 1,
        fechaCreacion: ahora, fechaActualizacion: ahora, compania: companias[id === 4 ? 1 : 0] })) as ProyectoAdmin[];
    const relaciones = usuarios.map((usuario, i) => ({ id: i + 1, usuarioId: usuario.id, rolId: i + 1, usuario, rol: roles[i] })) as UsuarioRol[];
    const accesos = [[31, 1], [20, 1], [10, 1], [10, 2], [10, 3]].map(([usuarioId, proyectoId], i) => ({ id: i + 1, usuarioId, proyectoId,
        estado: i < 3, fechaAsignacion: ahora, usuario: usuarios.find((u) => u.id === usuarioId), proyecto: proyectos.find((p) => p.id === proyectoId) })) as AsignacionAdmin[];
    const repo = {} as Fixture['repo'];
    for (const metodo of ['transaction', 'usuarios', 'usuario', 'rolesUsuario', 'roles', 'crearUsuario', 'actualizarUsuario', 'crearRol', 'actualizarRol', 'companias', 'crearCompania', 'actualizarCompania', 'proyectos', 'proyecto', 'crearProyecto', 'actualizarProyecto', 'asignaciones', 'crearAsignacion', 'actualizarAsignacion'] as const) repo[metodo] = vi.fn();
    repo.usuarios.mockImplementation(async () => usuarios);
    repo.usuario.mockImplementation(async (id: number) => usuarios.find((u) => u.id === id) ?? null);
    repo.roles.mockImplementation(async () => roles);
    repo.rolesUsuario.mockImplementation(async () => relaciones.map((r) => ({ ...r, usuario: usuarios.find((u) => u.id === r.usuarioId), rol: roles.find((a) => a.id === r.rolId) })));
    repo.crearUsuario.mockImplementation(async (data: UsuarioNuevo) => { const u = { ...data, id: Math.max(...usuarios.map((u) => u.id)) + 1 } as UsuarioAdmin; usuarios.push(u); return u; });
    repo.actualizarUsuario.mockImplementation(async (id: number, data: Partial<UsuarioNuevo>) => Object.assign(usuarios.find((u) => u.id === id)!, data));
    repo.crearRol.mockImplementation(async (usuarioId: number, rolId: number) => { relaciones.push({ id: relaciones.length + 1, usuarioId, rolId } as UsuarioRol); });
    repo.actualizarRol.mockImplementation(async (usuarioId: number, rolId: number) => Object.assign(relaciones.find((r) => r.usuarioId === usuarioId)!, { rolId }));
    repo.companias.mockImplementation(async () => companias);
    repo.crearCompania.mockImplementation(async (data: CompaniaNueva) => { const c = { ...data, id: companias.length + 1 } as Compania; companias.push(c); return c; });
    repo.actualizarCompania.mockImplementation(async (id: number, data: Partial<CompaniaNueva>) => Object.assign(companias.find((c) => c.id === id)!, data));
    repo.proyectos.mockImplementation(async () => proyectos.map((p) => ({ ...p, compania: companias.find((c) => c.id === p.companiaId) })));
    repo.proyecto.mockImplementation(async (id: number) => { const p = proyectos.find((p) => p.id === id); return p ? { ...p, compania: companias.find((c) => c.id === p.companiaId) } : null; });
    repo.crearProyecto.mockImplementation(async (data: ProyectoNuevo) => { const p = { ...data, id: proyectos.length + 1 } as unknown as ProyectoAdmin; proyectos.push(p); return p; });
    repo.actualizarProyecto.mockImplementation(async (id: number, data: Partial<ProyectoNuevo>) => Object.assign(proyectos.find((p) => p.id === id)!, data));
    repo.asignaciones.mockImplementation(async () => accesos.map((a) => ({ ...a, usuario: usuarios.find((u) => u.id === a.usuarioId), proyecto: { ...proyectos.find((p) => p.id === a.proyectoId)!, compania: companias.find((c) => c.id === proyectos.find((p) => p.id === a.proyectoId)?.companiaId) } })));
    repo.crearAsignacion.mockImplementation(async (data: AsignacionNueva) => { const a = { ...data, id: accesos.length + 1 } as unknown as AsignacionAdmin; accesos.push(a); return a; });
    repo.actualizarAsignacion.mockImplementation(async (id: number, data: Partial<AsignacionNueva>) => Object.assign(accesos.find((a) => a.id === id)!, data));
    let cola = Promise.resolve();
    repo.transaction.mockImplementation(async (work: (r: AdministracionRepository) => Promise<unknown>) => {
        const turno = cola; let liberar!: () => void; cola = new Promise<void>((r) => { liberar = r; }); await turno;
        const arrays = [usuarios, relaciones, companias, proyectos, accesos]; const snapshot = arrays.map((rows) => rows.map((r) => ({ ...r })));
        try { return await work(repo as unknown as AdministracionRepository); }
        catch (error) { arrays.forEach((rows, i) => { rows.splice(0, rows.length, ...snapshot[i]! as never[]); }); throw error; }
        finally { liberar(); }
    });
    return { repo, usuarios, companias, proyectos, roles, relaciones, accesos };
}
