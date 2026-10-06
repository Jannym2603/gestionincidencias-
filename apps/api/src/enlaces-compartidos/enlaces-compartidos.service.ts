import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import type { TicketCompleto } from '../tickets/tickets.repository.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { EnlacesCompartidosRepository } from './enlaces-compartidos.repository.js';
import type { Enlace, EnlaceNuevo } from './enlaces-compartidos.repository.js';
import { crearEnlaceDTO, nombre, SOLO_LECTURA, urlCompartida } from './enlaces-compartidos.rules.js';

export type UsuarioEnlace = UsuarioAutenticado & { sub?: unknown };
@Injectable()
export class EnlacesCompartidosService {
    constructor(private readonly repo: EnlacesCompartidosRepository, private readonly tickets: TicketsRepository,
        private readonly acceso: AccesoTicketService, private readonly notificaciones: NotificacionService) {}
    private async autorizado(id: number, claims: UsuarioEnlace) {
        const usuario = typeof claims.sub === 'string' ? await this.repo.usuario(claims.sub) : null;
        if (!usuario) throw new NotFoundException('No se encontró el usuario autenticado.');
        const rol = (await this.repo.rol(usuario.id))?.rol?.nombre?.trim().toUpperCase();
        if (rol !== 'ADMIN' && rol !== 'SUPERVISOR') throw new ForbiddenException('Tu rol no puede compartir tickets.');
        const ticket = await this.acceso.obtener(id, { usuarioId: usuario.id, rol });
        return { usuario, ticket };
    }
    private dto(e: Enlace, t: TicketCompleto) {
        return { id: e.id <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(e.id) : e.id.toString(), ticketId: t.id, numeroTicket: t.numeroTicket,
            correoDestinatario: e.correoDestinatario, token: e.token, enlace: urlCompartida(e.token), ...SOLO_LECTURA,
            fechaCreacion: e.fechaCreacion, fechaExpiracion: e.fechaExpiracion, activo: e.activo };
    }
    async crear(id: number, body: unknown, claims: UsuarioEnlace) {
        const { usuario, ticket } = await this.autorizado(id, claims);
        const ahora = Temporal.Now.plainDateTimeISO();
        const data = crearEnlaceDTO(body, ahora);
        const token = `${randomUUID()}-${randomUUID()}`;
        const enlace = await this.repo.crear({ ticketId: ticket.id, creadoPor: usuario.id, token, ...data,
            ...SOLO_LECTURA, fechaCreacion: ahora, activo: true } as EnlaceNuevo);
        // El fallo del correo nunca revierte el enlace ya creado.
        try { await this.notificaciones.notificarEnlaceCompartido(data.correoDestinatario, ticket, nombre(usuario, 'Un usuario'), data.fechaExpiracion, urlCompartida(token)); } catch { /* SMTP no es crítico. */ }
        return this.dto(enlace, ticket);
    }
    async listar(id: number, claims: UsuarioEnlace) {
        const { ticket } = await this.autorizado(id, claims);
        return (await this.repo.listar(id)).map((e) => this.dto(e, ticket));
    }
    async revocar(id: bigint, claims: UsuarioEnlace) {
        const e = await this.repo.porId(id);
        if (!e) throw new NotFoundException('No se encontró el enlace compartido.');
        const { ticket } = await this.autorizado(e.ticketId, claims);
        if (e.activo) await this.repo.revocar(id);
        return this.dto({ ...e, activo: false }, ticket);
    }
    async publico(token: string) {
        if (!token?.trim()) throw new BadRequestException('El token del enlace es obligatorio.');
        const e = token.trim().length <= 150 ? await this.repo.porToken(token.trim()) : null;
        if (!e) throw new NotFoundException('El enlace no existe.');
        if (!e.activo) throw new ForbiddenException('El enlace fue desactivado.');
        if (e.fechaExpiracion && Temporal.PlainDateTime.compare(Temporal.Now.plainDateTimeISO(), e.fechaExpiracion) >= 0) throw new ForbiddenException('El enlace ha expirado.');
        if (!e.puedeVer) throw new ForbiddenException('El enlace no permite ver el ticket.');
        const t = await this.tickets.findOne(e.ticketId);
        if (!t?.proyecto?.estado || !t.proyecto.compania?.estado) throw new ForbiddenException('El proyecto del ticket no está disponible.');
        return { ticketId: t.id, numeroTicket: t.numeroTicket, titulo: t.titulo, descripcion: t.descripcion, estado: t.estado,
            prioridad: t.prioridad, categoria: t.tipoIncidencia?.nombre ?? 'Sin categoría', nombreCliente: nombre(t.cliente),
            nombreAgente: t.agenteAsignado ? nombre(t.agenteAsignado) : 'Sin asignar', ...SOLO_LECTURA,
            fechaCreacion: t.fechaCreacion, fechaExpiracion: e.fechaExpiracion };
    }
}
