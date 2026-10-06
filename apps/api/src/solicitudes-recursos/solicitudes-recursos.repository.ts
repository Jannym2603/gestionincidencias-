import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

function consulta() {
    return db.orm.public.SolicitudesRecurso.include('ticket', (t) => t.include('cliente').include('proyecto', (p) => p.include('compania')));
}
export type SolicitudCompleta = NonNullable<Awaited<ReturnType<SolicitudesRecursosRepository['findOne']>>>;
export type Solicitud = Omit<SolicitudCompleta, 'ticket'>;

@Injectable()
export class SolicitudesRecursosRepository {
    async findAll() { return await consulta().all(); }
    findOne(id: number) { return consulta().where((s) => s.id.eq(id)).first(); }
    findByTicket(id: number) { return consulta().where((s) => s.ticketId.eq(id)).first(); }
}
