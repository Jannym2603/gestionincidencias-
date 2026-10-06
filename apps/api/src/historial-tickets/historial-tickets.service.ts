import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { HistorialTicketsRepository } from './historial-tickets.repository.js';
import type { HistorialCompleto } from './historial-tickets.repository.js';

export function historialDTO(h: HistorialCompleto) {
    return { id: h.id, ticketId: h.ticketId, numeroTicket: h.ticket.numeroTicket,
        usuarioId: h.usuario?.id ?? null, nombreUsuario: h.usuario ? `${h.usuario.nombre ?? ''} ${h.usuario.apellido ?? ''}`.trim() : null,
        accion: h.accion, valorAnterior: h.valorAnterior, valorNuevo: h.valorNuevo, descripcion: h.descripcion, fechaCreacion: h.fechaCreacion };
}

@Injectable()
export class HistorialTicketsService {
    constructor(private readonly repo: HistorialTicketsRepository, private readonly acceso: AccesoTicketService,
        private readonly configuracion: ConfiguracionSistemaService) {}
    private async habilitado(usuario: UsuarioAutenticado) {
        this.acceso.identificar(usuario);
        const c = await this.configuracion.obtenerOCrear();
        const permiso = { ADMIN: true, SUPERVISOR: c.historialSupervisor, AGENTE: c.historialAgente, CLIENTE: c.historialCliente }[usuario.rol];
        if (!c.historialActivo || !permiso) throw new ForbiddenException('No tienes permisos para ver el historial.');
    }
    async findAll(usuario: UsuarioAutenticado) {
        await this.habilitado(usuario);
        const rows = await this.repo.findAll();
        const permitidos = await Promise.all(rows.map((h) => this.acceso.permitido(h.ticket, usuario)));
        return rows.filter((_, i) => permitidos[i]).map(historialDTO);
    }
    async findByTicket(id: number, usuario: UsuarioAutenticado) {
        await this.habilitado(usuario);
        await this.acceso.obtener(id, usuario);
        const rows = await this.repo.findByTicket(id);
        return rows.filter((h) => usuario.rol !== 'CLIENTE' || h.usuarioId === usuario.usuarioId).map(historialDTO);
    }
}
