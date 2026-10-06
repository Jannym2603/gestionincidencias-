import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CONFIGURACION_INICIAL } from './configuracion-sistema.service.js';
import type { ConfiguracionDTO } from './configuracion.rules.js';

export type AuditoriaConfiguracion = NonNullable<Awaited<ReturnType<typeof db.orm.public.AuditoriaConfiguracion.first>>>;
export type AuditoriaNueva = Omit<AuditoriaConfiguracion, 'id'>;

@Injectable()
export class ConfiguracionRepository {
    private orm = db.orm;
    async transaction<T>(work: (repo: ConfiguracionRepository) => Promise<T>): Promise<T> {
        return db.transaction(async (tx) => {
            // Misma exclusión que la inicialización existente: no duplica ni pierde actualizaciones concurrentes.
            await tx.execute(db.raw.sql`LOCK TABLE configuracion_sistema IN SHARE ROW EXCLUSIVE MODE`.affectedCount().build());
            const repo = new ConfiguracionRepository();
            repo.orm = tx.orm;
            return work(repo);
        });
    }
    async obtenerOCrear() {
        return await this.orm.public.ConfiguracionSistema.first() ?? await this.orm.public.ConfiguracionSistema.create(CONFIGURACION_INICIAL);
    }
    update(id: number, data: ConfiguracionDTO) { return this.orm.public.ConfiguracionSistema.where((c) => c.id.eq(id)).update(data); }
    usuario(correo: string) {
        return this.orm.public.Usuarios.where((u) => u.correo.eq(correo as AuditoriaConfiguracion['usuarioCorreo']))
            .select('nombre', 'apellido').first();
    }
    auditoria(data: AuditoriaNueva) { return this.orm.public.AuditoriaConfiguracion.create(data); }
    async obtenerAuditoria() { return await this.orm.public.AuditoriaConfiguracion.orderBy((a) => a.fechaCambio.desc()).all(); }
}
