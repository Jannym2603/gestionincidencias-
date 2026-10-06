import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { identificador } from './tickets.dto.js';
import { TicketsRepository } from './tickets.repository.js';
import type { TicketCompleto } from './tickets.repository.js';

type TicketAcceso = Pick<TicketCompleto, 'id' | 'proyectoId' | 'clienteId' | 'agenteAsignadoId'>;

export function validarUsuarioTicket(usuario: UsuarioAutenticado) {
    if (!usuario || !Number.isSafeInteger(usuario.usuarioId) || usuario.usuarioId <= 0) {
        throw new UnauthorizedException('No se pudo identificar al usuario.');
    }
}

export async function validarAccesoTicket(ticket: TicketAcceso | null, usuario: UsuarioAutenticado, acceso: AccesoProyectoService) {
    if (!ticket) throw new NotFoundException('Ticket no encontrado.');
    validarUsuarioTicket(usuario);
    if (usuario.rol === 'ADMIN') return;
    if (usuario.rol === 'CLIENTE') {
        if (ticket.clienteId !== usuario.usuarioId) throw new ForbiddenException('No tienes acceso a este ticket.');
        return;
    }
    await acceso.validarAccesoProyecto(usuario, ticket.proyectoId);
    if (usuario.rol === 'AGENTE' && ticket.agenteAsignadoId !== usuario.usuarioId) {
        throw new ForbiddenException('No tienes acceso a este ticket.');
    }
}

export async function obtenerTicketPermitido(repo: TicketsRepository, id: number, usuario: UsuarioAutenticado, acceso: AccesoProyectoService) {
    identificador(id, 'ticketId');
    const ticket = await repo.findOne(id);
    await validarAccesoTicket(ticket, usuario, acceso);
    return ticket!;
}

@Injectable()
export class AccesoTicketService {
    constructor(private readonly repo: TicketsRepository, private readonly acceso: AccesoProyectoService) {}

    identificar(usuario: UsuarioAutenticado) { validarUsuarioTicket(usuario); }

    obtener(id: number, usuario: UsuarioAutenticado, repo = this.repo) {
        return obtenerTicketPermitido(repo, id, usuario, this.acceso);
    }

    async permitido(ticket: TicketAcceso | null, usuario: UsuarioAutenticado): Promise<boolean> {
        try { await validarAccesoTicket(ticket, usuario, this.acceso); return true; }
        catch (error) { if (error instanceof ForbiddenException || error instanceof NotFoundException) return false; throw error; }
    }
}
