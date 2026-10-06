import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
export type Adjunto = NonNullable<Awaited<ReturnType<AdjuntosRepository['findOne']>>>;
export type AdjuntoNuevo = Parameters<typeof db.orm.public.Adjuntos.create>[0];
@Injectable()
export class AdjuntosRepository {
    findOne(id: number) { return db.orm.public.Adjuntos.where((a) => a.id.eq(id)).first(); }
    findByTicket(id: number) { return db.orm.public.Adjuntos.where((a) => a.ticketId.eq(id)).orderBy((a) => a.fechaSubida.desc()).all(); }
    create(data: AdjuntoNuevo) { return db.orm.public.Adjuntos.create(data); }
}
