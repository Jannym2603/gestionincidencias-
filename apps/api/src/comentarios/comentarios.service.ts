import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import type { ComentarioNuevo, HistorialNuevo, TicketCambios, TicketCompleto } from '../tickets/tickets.repository.js';
import { objeto, identificador, texto } from '../tickets/tickets.dto.js';
import { cumplido, fechasSla } from '../tickets/tickets.rules.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { ComentariosRepository } from './comentarios.repository.js';
import type { ComentarioCompleto } from './comentarios.repository.js';

export function comentarioDTO(c: ComentarioCompleto) {
    return { id: c.id, ticketId: c.ticketId, numeroTicket: c.ticket.numeroTicket, usuarioId: c.usuarioId,
        nombreUsuario: `${c.usuario.nombre} ${c.usuario.apellido}`, contenido: c.contenido,
        tipoComentario: c.tipoComentario, fechaCreacion: c.fechaCreacion };
}

@Injectable()
export class ComentariosService {
    private readonly logger = new Logger(ComentariosService.name);
    constructor(private readonly repo: ComentariosRepository, private readonly tickets: TicketsRepository,
        private readonly acceso: AccesoTicketService, private readonly notificaciones: NotificacionService) {}

    async findAll(usuario: UsuarioAutenticado) {
        this.acceso.identificar(usuario);
        const rows = await this.repo.findAll();
        const permitidos = await Promise.all(rows.map((c) => this.acceso.permitido(c.ticket, usuario)));
        return rows.filter((_, i) => permitidos[i]).map(comentarioDTO);
    }

    async findByTicket(id: number, usuario: UsuarioAutenticado) {
        try { await this.acceso.obtener(id, usuario); }
        catch (error) { if (error instanceof NotFoundException) throw new BadRequestException('Ticket no encontrado.'); throw error; }
        const rows = await this.repo.findByTicket(id);
        return rows.filter((c) => usuario.rol !== 'CLIENTE' || c.tipoComentario.toUpperCase() === 'PUBLICO').map(comentarioDTO);
    }

    async create(value: unknown, usuario: UsuarioAutenticado) {
        const body = objeto(value);
        const ticketId = identificador(body.ticketId, 'ticketId');
        const usuarioId = identificador(body.usuarioId, 'usuarioId');
        const contenido = texto(body.contenido, 'contenido');
        const tipo = texto(body.tipoComentario, 'tipoComentario', 20).toUpperCase();
        if (!['PUBLICO', 'INTERNO'].includes(tipo)) throw new BadRequestException('Tipo de comentario no válido. Use PUBLICO o INTERNO.');
        let ticketNotificado: TicketCompleto;
        const resultado = await this.tickets.transaction(ticketId, async (repo) => {
            let ticket: TicketCompleto;
            try { ticket = await this.acceso.obtener(ticketId, usuario, repo); }
            catch (error) { if (error instanceof NotFoundException) throw new BadRequestException('Ticket no encontrado.'); throw error; }
            if (usuarioId !== usuario.usuarioId) throw new ForbiddenException('No puedes publicar comentarios a nombre de otro usuario.');
            if (usuario.rol === 'CLIENTE' && tipo === 'INTERNO') throw new ForbiddenException('Los clientes solo pueden agregar comentarios públicos.');
            const autor = await repo.findUsuario(usuario.usuarioId);
            if (!autor) throw new UnauthorizedException('No se pudo identificar al usuario.');
            const fecha = Temporal.Now.plainDateTimeISO();
            const guardado = await repo.comentario({ ticketId, usuarioId: usuario.usuarioId, contenido,
                tipoComentario: tipo, fechaCreacion: fecha } as ComentarioNuevo);
            const cambios: TicketCambios = { fechaActualizacion: fecha };
            const rol = tipo === 'PUBLICO' && !ticket.fechaPrimeraRespuesta ? await repo.findRol(usuario.usuarioId) : null;
            if (rol && ['ADMIN', 'SUPERVISOR', 'AGENTE'].includes(rol.rol.nombre.trim().toUpperCase())) {
                const valor = ticket.prioridad?.trim().toUpperCase();
                const p = ['P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAJA'].includes(valor) ? valor : 'P4_BAJA';
                const limite = ticket.fechaLimiteRespuesta ?? fechasSla(p, ticket.fechaCreacion ?? fecha, false).fechaLimiteRespuesta;
                cambios.fechaPrimeraRespuesta = fecha;
                cambios.fechaLimiteRespuesta = limite;
                cambios.slaRespuestaCumplido = cumplido(fecha, limite);
                const estado = cambios.slaRespuestaCumplido ? 'CUMPLIDO' : 'INCUMPLIDO';
                await repo.historial({ ticketId, usuarioId: usuario.usuarioId, accion: 'PRIMERA_RESPUESTA_SLA',
                    valorAnterior: null, valorNuevo: estado, descripcion: `Se registró la primera respuesta del ticket. Estado SLA: ${estado}`,
                    fechaCreacion: fecha } as HistorialNuevo);
            }
            await repo.update(ticketId, cambios);
            await repo.historial({ ticketId, usuarioId: usuario.usuarioId, accion: 'COMENTARIO_AGREGADO', valorAnterior: null,
                valorNuevo: tipo, descripcion: `Se agregó un comentario de tipo ${tipo}`, fechaCreacion: fecha } as HistorialNuevo);
            ticketNotificado = ticket;
            return comentarioDTO({ ...guardado, ticket, usuario: autor });
        });
        if (tipo === 'PUBLICO') {
            try { await this.notificaciones.notificarComentarioPublico(ticketNotificado!, contenido); }
            catch { this.logger.warn('No se pudo enviar la notificación del comentario.'); }
        }
        return resultado;
    }
}
