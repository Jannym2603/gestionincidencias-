import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

function consulta(orm: typeof db.orm) {
    return orm.public.Tickets
        .include('cliente')
        .include('agenteAsignado')
        .include('tipoIncidencia')
        .include('proyecto', (p) => p.include('compania'));
}

export type TicketCompleto = NonNullable<Awaited<ReturnType<TicketsRepository['findOne']>>>;
export type TicketNuevo = Parameters<typeof db.orm.public.Tickets.create>[0];
export type TicketCambios = Partial<TicketNuevo>;
export type HistorialNuevo = Parameters<typeof db.orm.public.HistorialTickets.create>[0];
export type RecursoNuevo = Parameters<typeof db.orm.public.SolicitudesRecurso.create>[0];
export type ComentarioNuevo = Parameters<typeof db.orm.public.Comentarios.create>[0];

@Injectable()
export class TicketsRepository {
    private orm: typeof db.orm = db.orm;

    async transaction<T>(ticketId: number | null, work: (repo: TicketsRepository) => Promise<T>): Promise<T> {
        return db.transaction(async (tx) => {
            if (ticketId === null) {
                // Serializa la numeracion anual, incluso frente a INSERT de Spring Boot.
                await tx.execute(db.raw.sql`LOCK TABLE tickets IN SHARE ROW EXCLUSIVE MODE`.affectedCount().build());
            } else {
                await tx.query(db.raw.sql`SELECT id FROM tickets WHERE id = ${ticketId} FOR UPDATE`
                    .returnsRow({ id: 'pg/int4@1' }).build());
            }
            const repo = new TicketsRepository();
            repo.orm = tx.orm;
            return work(repo);
        });
    }

    async findAll(ids: number[] | null, usuarioId: number, rol: string) {
        let query = consulta(this.orm);
        if (ids !== null) {
            if (!ids.length) return [];
            query = query.where((t) => t.proyectoId.in(ids));
            if (rol === 'CLIENTE') query = query.where((t) => t.clienteId.eq(usuarioId));
            if (rol === 'AGENTE') query = query.where((t) => t.agenteAsignadoId.eq(usuarioId));
            return query.orderBy((t) => t.fechaCreacion.desc()).all();
        }
        return query.all();
    }

    findOne(id: number) { return consulta(this.orm).where((t) => t.id.eq(id)).first(); }
    findUsuario(id: number) { return this.orm.public.Usuarios.where((u) => u.id.eq(id)).first(); }
    findRol(usuarioId: number) {
        return this.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(usuarioId)).include('rol').first();
    }
    findProyecto(id: number) { return this.orm.public.Proyectos.where((p) => p.id.eq(id)).include('compania').first(); }
    findTipo(id: number) { return this.orm.public.TiposIncidencia.where((t) => t.id.eq(id)).first(); }
    configuracion() { return this.orm.public.ConfiguracionSistema.first(); }
    async numeroTicket(anio: number) {
        const prefijo = `INC-${anio}-`;
        const rows = await this.orm.public.Tickets.where((t) => t.numeroTicket.like(`${prefijo}%`)).select('numeroTicket').all();
        // Spring Boot: countByNumeroTicketStartingWith(prefijo) + 1, incluso si existen huecos.
        return `${prefijo}${String(rows.length + 1).padStart(4, '0')}`;
    }
    create(data: TicketNuevo) { return this.orm.public.Tickets.create(data); }
    update(id: number, data: TicketCambios) { return this.orm.public.Tickets.where((t) => t.id.eq(id)).update(data); }
    historial(data: HistorialNuevo) { return this.orm.public.HistorialTickets.create(data); }
    recurso(data: RecursoNuevo) { return this.orm.public.SolicitudesRecurso.create(data); }
    findRecurso(id: number) { return this.orm.public.SolicitudesRecurso.where((s) => s.id.eq(id)).first(); }
    updateRecurso(id: number, data: Partial<RecursoNuevo>) {
        return this.orm.public.SolicitudesRecurso.where((s) => s.id.eq(id)).update(data);
    }
    comentario(data: ComentarioNuevo) { return this.orm.public.Comentarios.create(data); }
}
