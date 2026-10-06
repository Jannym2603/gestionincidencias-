import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthUsuario } from '../auth/auth.repository.js';

export type EnlaceNuevo = Parameters<typeof db.orm.public.EnlacesCompartidos.create>[0];
export type Enlace = NonNullable<Awaited<ReturnType<EnlacesCompartidosRepository['porId']>>>;

@Injectable()
export class EnlacesCompartidosRepository {
    usuario(correo: string) { return db.orm.public.Usuarios.where((u) => u.correo.eq(correo as AuthUsuario['correo'])).first(); }
    rol(id: number) { return db.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(id)).include('rol').first(); }
    porId(id: bigint) { return db.orm.public.EnlacesCompartidos.where((e) => e.id.eq(id)).first(); }
    porToken(token: string) { return db.orm.public.EnlacesCompartidos.where((e) => e.token.eq(token as EnlaceNuevo['token'])).first(); }
    async listar(ticketId: number) { return await db.orm.public.EnlacesCompartidos.where((e) => e.ticketId.eq(ticketId)).orderBy((e) => e.fechaCreacion.desc()).all(); }
    crear(data: EnlaceNuevo) { return db.orm.public.EnlacesCompartidos.create(data); }
    revocar(id: bigint) { return db.orm.public.EnlacesCompartidos.where((e) => e.id.eq(id)).update({ activo: false }); }
}
