import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export type UsuarioNuevo = Parameters<typeof db.orm.public.Usuarios.create>[0];
export type CompaniaNueva = Parameters<typeof db.orm.public.Companias.create>[0];
export type ProyectoNuevo = Parameters<typeof db.orm.public.Proyectos.create>[0];
export type AsignacionNueva = Parameters<typeof db.orm.public.UsuarioProyectos.create>[0];
export type UsuarioAdmin = NonNullable<Awaited<ReturnType<AdministracionRepository['usuario']>>>;
export type ProyectoAdmin = NonNullable<Awaited<ReturnType<AdministracionRepository['proyecto']>>>;
export type AsignacionAdmin = Awaited<ReturnType<AdministracionRepository['asignaciones']>>[number];

@Injectable()
export class AdministracionRepository {
    private orm: typeof db.orm = db.orm;
    async transaction<T>(work: (r: AdministracionRepository) => Promise<T>) {
        return db.transaction(async (tx) => {
            // Orden único para serializar duplicados y cambios de usuario/rol/acceso.
            await tx.execute(db.raw.sql`LOCK TABLE companias, proyectos, usuarios, usuario_roles, usuario_proyectos IN SHARE ROW EXCLUSIVE MODE`.affectedCount().build());
            const r = new AdministracionRepository(); r.orm = tx.orm;
            return work(r);
        });
    }
    async usuarios() { return await this.orm.public.Usuarios.all(); }
    usuario(id: number) { return this.orm.public.Usuarios.where((u) => u.id.eq(id)).first(); }
    async rolesUsuario() { return await this.orm.public.UsuarioRoles.include('rol').include('usuario').all(); }
    async roles() { return await this.orm.public.Roles.all(); }
    crearUsuario(data: UsuarioNuevo) { return this.orm.public.Usuarios.create(data); }
    actualizarUsuario(id: number, data: Partial<UsuarioNuevo>) { return this.orm.public.Usuarios.where((u) => u.id.eq(id)).update(data); }
    crearRol(usuarioId: number, rolId: number) { return this.orm.public.UsuarioRoles.create({ usuarioId, rolId }); }
    actualizarRol(usuarioId: number, rolId: number) { return this.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(usuarioId)).update({ rolId }); }
    async companias() { return await this.orm.public.Companias.all(); }
    crearCompania(data: CompaniaNueva) { return this.orm.public.Companias.create(data); }
    actualizarCompania(id: number, data: Partial<CompaniaNueva>) { return this.orm.public.Companias.where((c) => c.id.eq(id)).update(data); }
    async proyectos() { return await this.orm.public.Proyectos.include('compania').all(); }
    proyecto(id: number) { return this.orm.public.Proyectos.where((p) => p.id.eq(id)).include('compania').first(); }
    crearProyecto(data: ProyectoNuevo) { return this.orm.public.Proyectos.create(data); }
    actualizarProyecto(id: number, data: Partial<ProyectoNuevo>) { return this.orm.public.Proyectos.where((p) => p.id.eq(id)).update(data); }
    async asignaciones() { return await this.orm.public.UsuarioProyectos.include('usuario').include('proyecto', (p) => p.include('compania')).all(); }
    crearAsignacion(data: AsignacionNueva) { return this.orm.public.UsuarioProyectos.create(data); }
    actualizarAsignacion(id: number, data: Partial<AsignacionNueva>) { return this.orm.public.UsuarioProyectos.where((a) => a.id.eq(id)).update(data); }
}
