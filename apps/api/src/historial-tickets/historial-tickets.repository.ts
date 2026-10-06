import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
export type HistorialCompleto = Awaited<ReturnType<HistorialTicketsRepository['findAll']>>[number];
@Injectable()
export class HistorialTicketsRepository {
    findAll() { return db.orm.public.HistorialTickets.include('ticket').include('usuario').all(); }
    findByTicket(id: number) {
        return db.orm.public.HistorialTickets.where((h) => h.ticketId.eq(id)).include('ticket').include('usuario')
            .orderBy((h) => h.fechaCreacion.desc()).all();
    }
}
