import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export type ConfiguracionSistema = NonNullable<Awaited<ReturnType<typeof db.orm.public.ConfiguracionSistema.first>>>;
type NuevaConfiguracion = Omit<ConfiguracionSistema, 'id'>;

export const CONFIGURACION_INICIAL: NuevaConfiguracion = {
    crearTicketActivo: true, solicitudesRecursosActivo: true, reportesActivos: true, historialActivo: true,
    crearTicketCliente: true, crearTicketAgente: true, crearTicketSupervisor: true, crearTicketAdmin: true,
    solicitudesRecursosCliente: true, solicitudesRecursosAgente: true, solicitudesRecursosSupervisor: true, solicitudesRecursosAdmin: true,
    reportesCliente: true, reportesAgente: true, reportesSupervisor: true, reportesAdmin: true,
    historialCliente: true, historialAgente: true, historialSupervisor: true, historialAdmin: true,
    varianteVisual: 'A' as NuevaConfiguracion['varianteVisual'],
};

@Injectable()
export class ConfiguracionSistemaService {
    // Spring Boot initializes on first access, rather than on application startup.
    async obtenerOCrear(): Promise<ConfiguracionSistema> {
        const existente = await db.orm.public.ConfiguracionSistema.first();
        if (existente) return existente;
        return db.transaction(async (tx) => {
            await tx.execute(db.raw.sql`LOCK TABLE configuracion_sistema IN SHARE ROW EXCLUSIVE MODE`.affectedCount().build());
            // Recheck after acquiring the lock: another request may have created it.
            const configuracion = await tx.orm.public.ConfiguracionSistema.first();
            return configuracion ?? await tx.orm.public.ConfiguracionSistema.create(CONFIGURACION_INICIAL);
        });
    }
}
