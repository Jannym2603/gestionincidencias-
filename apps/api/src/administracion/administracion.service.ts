import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { codificar } from '../auth/auth.rules.js';
import { identificador, objeto, opcional, texto } from '../tickets/tickets.dto.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AdministracionRepository } from './administracion.repository.js';
import type { UsuarioAdmin, UsuarioNuevo, CompaniaNueva, ProyectoNuevo, ProyectoAdmin, AsignacionAdmin } from './administracion.repository.js';

const fallo = (mensaje: string): never => { throw new BadRequestException(mensaje); };
export function estadoDTO(v: unknown): boolean { if (typeof v !== 'boolean') return fallo('El estado es obligatorio.'); return v; }
export const proyectoDTO = (p: ProyectoAdmin) => ({ id: p.id, companiaId: p.companiaId, companiaNombre: p.compania?.nombre ?? null,
    nombre: p.nombre, descripcion: p.descripcion, estado: p.estado, fechaCreacion: p.fechaCreacion, fechaActualizacion: p.fechaActualizacion });
export const asignacionDTO = (a: AsignacionAdmin) => ({ id: a.id, usuarioId: a.usuarioId,
    usuarioNombre: `${a.usuario.nombre} ${a.usuario.apellido}`, usuarioCorreo: a.usuario.correo,
    proyectoId: a.proyectoId, proyectoNombre: a.proyecto?.nombre ?? null, companiaId: a.proyecto?.companiaId ?? null,
    companiaNombre: a.proyecto?.compania?.nombre ?? null, estado: a.estado, fechaAsignacion: a.fechaAsignacion });

@Injectable()
export class AdministracionService {
    constructor(private readonly repo: AdministracionRepository, private readonly acceso: AccesoProyectoService) {}
    private async usuarioDTO(u: UsuarioAdmin, r = this.repo) {
        const relacion = (await r.rolesUsuario()).find((a) => a.usuarioId === u.id);
        if (!relacion) return fallo('El usuario no tiene rol asignado.');
        return { id: u.id, nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono,
            rol: relacion.rol.nombre, estado: u.estado, fechaCreacion: u.fechaCreacion };
    }
    async usuarios() { return Promise.all((await this.repo.usuarios()).map((u) => this.usuarioDTO(u))); }
    async perfil(actor: UsuarioAutenticado) { const u = await this.repo.usuario(actor.usuarioId); if (!u) return fallo('Usuario autenticado no encontrado.'); return this.usuarioDTO(u); }
    private gestionarRol(rol: string, actor: UsuarioAutenticado) {
        if (actor.rol !== 'ADMIN' && !['CLIENTE', 'AGENTE'].includes(rol)) return fallo('El SUPERVISOR solo puede administrar usuarios CLIENTE y AGENTE.');
        if (!['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(rol)) return fallo('Rol no válido.');
    }
    private async password(v: unknown) {
        if (typeof v !== 'string' || !v.trim() || v.length < 6) return fallo('La contraseña debe tener al menos 6 caracteres.');
        if (Buffer.byteLength(v, 'utf8') > 72) return fallo('La contraseña no puede superar 72 bytes UTF-8.');
        return codificar(v);
    }
    async guardarUsuario(id: number | null, value: unknown, actor: UsuarioAutenticado) {
        const b = objeto(value);
        return this.repo.transaction(async (r) => {
            const actual = id === null ? null : await r.usuario(id);
            if (id !== null && !actual) return fallo('Usuario no encontrado.');
            if (actual) { const relacion = (await r.rolesUsuario()).find((a) => a.usuarioId === id); if (!relacion) return fallo('El usuario no tiene rol asignado.'); this.gestionarRol(relacion.rol.nombre.trim().toUpperCase(), actor); }
            const rol = texto(b.rol, 'rol').toUpperCase(); this.gestionarRol(rol, actor);
            const correo = texto(b.correo, 'correo', 150).toLowerCase();
            if ((await r.usuarios()).some((u) => u.id !== id && u.correo === correo)) return fallo('Ya existe un usuario con ese correo.');
            const registroRol = (await r.roles()).find((a) => a.nombre === rol); if (!registroRol) return fallo('Rol no encontrado en la base de datos.');
            const datos = { nombre: texto(b.nombre, 'nombre', 100), apellido: texto(b.apellido, 'apellido', 100), correo,
                telefono: opcional(b.telefono, 'telefono', 20) } as Partial<UsuarioNuevo>;
            if (id === null || (typeof b.password === 'string' && b.password.trim())) datos.password = await this.password(b.password) as UsuarioNuevo['password'];
            let usuario: UsuarioAdmin;
            if (id === null) { usuario = await r.crearUsuario({ ...datos, estado: true, fechaCreacion: Temporal.Now.plainDateTimeISO() } as UsuarioNuevo); await r.crearRol(usuario.id, registroRol.id); }
            else { await r.actualizarUsuario(id, datos); await r.actualizarRol(id, registroRol.id); usuario = (await r.usuario(id))!; }
            return this.usuarioDTO(usuario, r);
        });
    }
    async estadoUsuario(id: number, value: unknown, actor: UsuarioAutenticado) {
        const estado = estadoDTO(objeto(value).estado);
        return this.repo.transaction(async (r) => {
            const u = await r.usuario(id); if (!u) return fallo('Usuario no encontrado.');
            const rol = (await r.rolesUsuario()).find((a) => a.usuarioId === id); if (!rol) return fallo('El usuario no tiene rol asignado.');
            this.gestionarRol(rol.rol.nombre.trim().toUpperCase(), actor);
            if (!estado && id === actor.usuarioId) return fallo('No puedes desactivar tu propia cuenta.');
            await r.actualizarUsuario(id, { estado }); return this.usuarioDTO({ ...u, estado }, r);
        });
    }
    async usuarioRoles() { return (await this.repo.rolesUsuario()).map((a) => ({ id: a.id, usuarioId: a.usuarioId,
        nombreUsuario: `${a.usuario.nombre} ${a.usuario.apellido}`, correoUsuario: a.usuario.correo, rolId: a.rolId, nombreRol: a.rol.nombre })); }
    async companias(activas = false) { const rows = await this.repo.companias(); return activas ? rows.filter((c) => c.estado).sort((a, b) => a.nombre.localeCompare(b.nombre)) : rows; }
    async compania(id: number, r = this.repo) { return (await r.companias()).find((c) => c.id === id) ?? fallo('Compañía no encontrada.'); }
    async guardarCompania(id: number | null, value: unknown) {
        const b = objeto(value); const nombre = texto(b.nombre, 'nombre', 150); const descripcion = opcional(b.descripcion, 'descripcion', 1000);
        return this.repo.transaction(async (r) => {
            const actual = id === null ? null : await this.compania(id, r);
            if ((await r.companias()).some((c) => c.id !== id && c.nombre.toLowerCase() === nombre.toLowerCase())) return fallo('Ya existe una compañía con ese nombre.');
            const datos = { nombre, descripcion, estado: b.estado == null ? actual?.estado ?? true : estadoDTO(b.estado), fechaActualizacion: Temporal.Now.plainDateTimeISO() } as CompaniaNueva;
            if (id === null) return r.crearCompania({ ...datos, fechaCreacion: datos.fechaActualizacion });
            await r.actualizarCompania(id, datos); return { ...actual!, ...datos };
        });
    }
    async estadoCompania(id: number, value: unknown) {
        const estado = estadoDTO(value);
        return this.repo.transaction(async (r) => { const c = await this.compania(id, r); const cambios = { estado, fechaActualizacion: Temporal.Now.plainDateTimeISO() }; await r.actualizarCompania(id, cambios); return { ...c, ...cambios }; });
    }
    async proyectos(companiaId: number | null = null, activos = false) {
        if (companiaId !== null) await this.compania(companiaId);
        const rows = (await this.repo.proyectos()).filter((p) => (companiaId === null || p.companiaId === companiaId) && (!activos || p.estado));
        if (activos || companiaId !== null) rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
        return rows.map(proyectoDTO);
    }
    async guardarProyecto(id: number | null, value: unknown) {
        const b = objeto(value); const companiaId = identificador(b.companiaId, 'companiaId');
        const nombre = texto(b.nombre, 'nombre', 150), descripcion = opcional(b.descripcion, 'descripcion', 1000);
        return this.repo.transaction(async (r) => {
            const actual = id === null ? null : await r.proyecto(id); if (id !== null && !actual) return fallo('Proyecto no encontrado.');
            const compania = await this.compania(companiaId, r); if (!compania.estado) return fallo('No se puede asignar el proyecto a una compañía inactiva.');
            if ((await r.proyectos()).some((p) => p.id !== id && p.companiaId === companiaId && p.nombre.toLowerCase() === nombre.toLowerCase())) return fallo('Ya existe un proyecto con ese nombre dentro de la compañía.');
            const datos = { companiaId, nombre, descripcion, estado: b.estado == null ? actual?.estado ?? true : estadoDTO(b.estado), fechaActualizacion: Temporal.Now.plainDateTimeISO() } as ProyectoNuevo;
            if (id === null) { const p = await r.crearProyecto({ ...datos, fechaCreacion: datos.fechaActualizacion }); return proyectoDTO({ ...p, compania }); }
            await r.actualizarProyecto(id, datos); return proyectoDTO({ ...actual!, ...datos, compania });
        });
    }
    async estadoProyecto(id: number, value: unknown) {
        const estado = estadoDTO(value);
        return this.repo.transaction(async (r) => { const p = await r.proyecto(id); if (!p) return fallo('Proyecto no encontrado.');
            if (estado && !p.compania?.estado) return fallo('No se puede activar un proyecto de una compañía inactiva.');
            const cambios = { estado, fechaActualizacion: Temporal.Now.plainDateTimeISO() }; await r.actualizarProyecto(id, cambios); return proyectoDTO({ ...p, ...cambios }); });
    }
    private disponible(a: AsignacionAdmin) { return a.estado && a.proyecto?.estado && a.proyecto.compania?.estado; }
    async asignaciones(actor: UsuarioAutenticado, filtro: { usuarioId?: number; proyectoId?: number; propias?: boolean; todas?: boolean } = {}) {
        if (filtro.usuarioId !== undefined && !await this.repo.usuario(filtro.usuarioId)) return fallo('Usuario no encontrado.');
        if (filtro.proyectoId !== undefined && !await this.repo.proyecto(filtro.proyectoId)) return fallo('Proyecto no encontrado.');
        if (actor.rol === 'CLIENTE' && filtro.usuarioId !== undefined && filtro.usuarioId !== actor.usuarioId) return fallo('No tienes permiso para consultar los proyectos de otro usuario.');
        const ids = actor.rol === 'SUPERVISOR' ? await this.acceso.obtenerIdsPermitidos(actor) : null;
        if (filtro.proyectoId !== undefined && ids !== null && !ids.includes(filtro.proyectoId)) throw new ForbiddenException('No tienes acceso al proyecto seleccionado.');
        const rows = (await this.repo.asignaciones()).filter((a) => a.proyecto && (!filtro.propias || a.usuarioId === actor.usuarioId)
            && (filtro.usuarioId === undefined || a.usuarioId === filtro.usuarioId) && (filtro.proyectoId === undefined || a.proyectoId === filtro.proyectoId)
            && (filtro.propias || filtro.proyectoId !== undefined || filtro.usuarioId !== undefined && !filtro.todas ? this.disponible(a) : true)
            && (filtro.propias || ids === null || ids.includes(a.proyectoId)));
        if (filtro.todas) rows.sort((a, b) => b.id - a.id);
        return rows.map(asignacionDTO);
    }
    async asignar(value: unknown, actor: UsuarioAutenticado) {
        const b = objeto(value), usuarioId = identificador(b.usuarioId, 'usuarioId'), proyectoId = identificador(b.proyectoId, 'proyectoId');
        return this.repo.transaction(async (r) => {
            const usuario = await r.usuario(usuarioId), proyecto = await r.proyecto(proyectoId);
            if (!usuario) return fallo('Usuario no encontrado.'); if (!proyecto) return fallo('Proyecto no encontrado.');
            if (actor.rol === 'SUPERVISOR') await this.acceso.validarAccesoProyecto(actor, proyectoId);
            if (!usuario.estado || !proyecto.estado || !proyecto.compania?.estado) return fallo('El usuario, proyecto y compañía deben estar activos.');
            const existente = (await r.asignaciones()).find((a) => a.usuarioId === usuarioId && a.proyectoId === proyectoId);
            if (existente?.estado) return fallo('El usuario ya tiene acceso a este proyecto.');
            const data = { usuarioId, proyectoId, estado: true, fechaAsignacion: Temporal.Now.plainDateTimeISO() };
            if (existente) { await r.actualizarAsignacion(existente.id, data); return asignacionDTO({ ...existente, ...data }); }
            const a = await r.crearAsignacion(data); return asignacionDTO({ ...a, usuario, proyecto });
        });
    }
    async estadoAsignacion(id: number, estado: boolean, actor: UsuarioAutenticado) {
        return this.repo.transaction(async (r) => {
            const a = (await r.asignaciones()).find((row) => row.id === id); if (!a) return fallo('Asignación no encontrada.');
            if (actor.rol !== 'ADMIN') await this.acceso.validarAccesoProyecto(actor, a.proyectoId);
            if (a.estado === estado) return fallo(estado ? 'El acceso ya se encuentra activo.' : 'El acceso ya se encuentra desactivado.');
            if (estado && (!a.usuario?.estado || !a.proyecto?.estado || !a.proyecto.compania?.estado)) return fallo('El usuario, proyecto y compañía deben estar activos.');
            const cambios = { estado, ...(estado ? { fechaAsignacion: Temporal.Now.plainDateTimeISO() } : {}) };
            await r.actualizarAsignacion(id, cambios); return asignacionDTO({ ...a, ...cambios });
        });
    }
}
