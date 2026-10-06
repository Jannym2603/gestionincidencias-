import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import type { AuthUsuario } from '../auth/auth.repository.js';

@Injectable()
export class ReportesRepository {
    constructor(private readonly tickets: TicketsRepository) {}
    usuario(correo: string) { return db.orm.public.Usuarios.where((u) => u.correo.eq(correo as AuthUsuario['correo'])).select('id').first(); }
    rol(id: number) { return db.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(id)).include('rol').first(); }
    findTickets(ids: number[] | null, usuarioId: number, rol: string) { return this.tickets.findAll(ids, usuarioId, rol); }
    async totalUsuarios() { return (await db.orm.public.Usuarios.select('id').all()).length; }
    async comentarios(ids: number[]) {
        if (!ids.length) return [];
        return await db.orm.public.Comentarios.where((c) => c.ticketId.in(ids)).select('ticketId', 'tipoComentario').all();
    }
    async recursos(ids: number[]) {
        if (!ids.length) return [];
        return await db.orm.public.SolicitudesRecurso.where((s) => s.ticketId.in(ids)).all();
    }
}
