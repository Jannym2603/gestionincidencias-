import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export type AuthUsuario = NonNullable<Awaited<ReturnType<typeof db.orm.public.Usuarios.first>>>;
export type CodigoRecuperacion = NonNullable<Awaited<ReturnType<AuthRepository['findCodigo']>>>;
export type CodigoNuevo = Omit<CodigoRecuperacion, 'id'>;

@Injectable()
export class AuthRepository {
    private orm = db.orm;
    private borrar?: (correo: string) => Promise<unknown>;
    findUsuario(correo: string) { return this.orm.public.Usuarios.where((u) => u.correo.eq(correo as AuthUsuario['correo'])).first(); }
    findRol(id: number) { return this.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(id)).include('rol').first(); }
    updatePassword(id: number, password: string) {
        return this.orm.public.Usuarios.where((u) => u.id.eq(id)).update({ password: password as AuthUsuario['password'] });
    }
    findCodigo(correo: string) {
        return this.orm.public.CodigosRecuperacionPassword.where((c) => c.correo.eq(correo as AuthUsuario['correo'])).where((c) => c.usado.eq(false))
            .orderBy((c) => c.fechaCreacion.desc()).first();
    }
    createCodigo(data: CodigoNuevo) { return this.orm.public.CodigosRecuperacionPassword.create(data); }
    updateCodigo(id: number, data: Partial<Pick<CodigoRecuperacion, 'usado' | 'intentosFallidos'>>) {
        return this.orm.public.CodigosRecuperacionPassword.where((c) => c.id.eq(id)).update(data);
    }
    deleteCodigos(correo: string) {
        if (!this.borrar) throw new Error('La invalidación de códigos requiere una transacción.');
        return this.borrar(correo);
    }
    async transaction<T>(correo: string, work: (repo: AuthRepository) => Promise<T>): Promise<T> {
        return db.transaction(async (tx) => {
            // Serializa solicitar/confirmar/cambiar para una misma cuenta, incluso sin código previo.
            await tx.query(db.raw.sql`SELECT id FROM usuarios WHERE correo = ${correo} FOR UPDATE`
                .returnsRow({ id: 'pg/int4@1' }).build());
            const repo = new AuthRepository();
            repo.orm = tx.orm;
            repo.borrar = (email) => tx.execute(db.raw.sql`DELETE FROM codigos_recuperacion_password WHERE correo = ${email}`.affectedCount().build());
            return work(repo);
        });
    }
}
