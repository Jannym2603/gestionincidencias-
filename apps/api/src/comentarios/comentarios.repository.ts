import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

export type ComentarioCompleto = Awaited<ReturnType<ComentariosRepository['findAll']>>[number];

@Injectable()
export class ComentariosRepository {
    findAll() { return db.orm.public.Comentarios.include('ticket').include('usuario').all(); }
    findByTicket(ticketId: number) {
        return db.orm.public.Comentarios.where((c) => c.ticketId.eq(ticketId)).include('ticket').include('usuario').all();
    }
}
