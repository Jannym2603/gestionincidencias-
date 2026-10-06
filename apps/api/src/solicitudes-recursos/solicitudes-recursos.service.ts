import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import type { HistorialNuevo, TicketCambios } from '../tickets/tickets.repository.js';
import { identificador } from '../tickets/tickets.dto.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { SolicitudesRecursosRepository } from './solicitudes-recursos.repository.js';
import type { Solicitud } from './solicitudes-recursos.repository.js';
import { aplicarCambios, estado, normalizar, solicitudDTO } from './solicitudes-recursos.rules.js';

const CAMBIOS: readonly [keyof Solicitud, string, string][] = [
    ['categoria', 'CAMBIO_CATEGORIA_RECURSO', 'Se actualizó la categoría de la solicitud de recurso.'],
    ['recurso', 'CAMBIO_RECURSO', 'Se actualizó el recurso solicitado.'],
    ['cantidad', 'CAMBIO_CANTIDAD_RECURSO', 'Se actualizó la cantidad solicitada.'],
    ['proveedor', 'CAMBIO_PROVEEDOR', 'Se actualizó el proveedor asociado a la solicitud.'],
    ['estadoRecurso', 'CAMBIO_ESTADO_RECURSO', 'Se actualizó el estado de la solicitud de recurso.'],
    ['fechaSolicitudProveedor', 'CAMBIO_FECHA_SOLICITUD_PROVEEDOR', 'Se actualizó la fecha de solicitud al proveedor.'],
    ['fechaEstimadaEntrega', 'CAMBIO_FECHA_ESTIMADA_RECURSO', 'Se actualizó la fecha estimada de entrega del recurso.'],
    ['fechaEstimadaEntregaOriginal', 'REGISTRO_FECHA_ESTIMADA_ORIGINAL', 'Se registró la fecha estimada original de entrega del recurso.'],
    ['motivoRetraso', 'CAMBIO_MOTIVO_RETRASO_RECURSO', 'Se actualizó el motivo u observación principal del retraso del recurso.'],
    ['detalleRetraso', 'CAMBIO_DETALLE_RETRASO_RECURSO', 'Se actualizó el detalle del retraso o reprogramación del recurso.'],
    ['fechaRecepcion', 'CAMBIO_FECHA_RECEPCION_RECURSO', 'Se actualizó la fecha de recepción del recurso.'],
    ['fechaEntregaCliente', 'CAMBIO_FECHA_ENTREGA_RECURSO', 'Se actualizó la fecha de entrega del recurso al cliente.'],
    ['observaciones', 'CAMBIO_OBSERVACIONES_RECURSO', 'Se actualizaron las observaciones de la solicitud de recurso.'],
];
const DESCRIPCIONES: Record<string, string> = {
    EN_VALIDACION: 'La solicitud de recurso pasó a validación.', SOLICITADO_PROVEEDOR: 'La solicitud de recurso fue enviada al proveedor.',
    ESPERANDO_PROVEEDOR: 'La solicitud de recurso quedó en espera del proveedor.', RECIBIDO: 'El recurso fue recibido del proveedor.',
    ENTREGADO: 'El recurso fue entregado al cliente.', CERRADO: 'La solicitud de recurso fue cerrada.', CANCELADO: 'La solicitud de recurso fue cancelada.',
};

@Injectable()
export class SolicitudesRecursosService {
    private readonly logger = new Logger(SolicitudesRecursosService.name);
    constructor(private readonly repo: SolicitudesRecursosRepository, private readonly tickets: TicketsRepository,
        private readonly acceso: AccesoTicketService, private readonly config: ConfiguracionSistemaService,
        private readonly notificaciones: NotificacionService) {}

    private async habilitado(usuario: UsuarioAutenticado, escritura = false) {
        this.acceso.identificar(usuario);
        const c = await this.config.obtenerOCrear();
        const permiso = { ADMIN: true, SUPERVISOR: c.solicitudesRecursosSupervisor, AGENTE: c.solicitudesRecursosAgente,
            CLIENTE: c.solicitudesRecursosCliente }[usuario.rol];
        if (!c.solicitudesRecursosActivo || !permiso || (escritura && !['ADMIN', 'SUPERVISOR'].includes(usuario.rol))) {
            throw new ForbiddenException('No tienes permisos para solicitudes de recursos.');
        }
    }
    async findAll(usuario: UsuarioAutenticado) {
        await this.habilitado(usuario);
        const rows = await this.repo.findAll();
        const permisos = await Promise.all(rows.map((s) => this.acceso.permitido(s.ticket, usuario)));
        return rows.filter((_, i) => permisos[i]).map(solicitudDTO);
    }
    async findOne(id: number, usuario: UsuarioAutenticado) {
        await this.habilitado(usuario);
        identificador(id, 'id');
        const s = await this.repo.findOne(id);
        if (!s) throw new NotFoundException('Solicitud de recurso no encontrada.');
        await this.acceso.obtener(s.ticketId, usuario);
        return solicitudDTO(s);
    }
    async findByTicket(id: number, usuario: UsuarioAutenticado) {
        await this.habilitado(usuario);
        identificador(id, 'ticketId');
        const s = await this.repo.findByTicket(id);
        if (!s) throw new NotFoundException('El ticket no tiene una solicitud de recurso asociada.');
        await this.acceso.obtener(s.ticketId, usuario);
        return solicitudDTO(s);
    }
    async update(id: number, body: unknown, usuario: UsuarioAutenticado) {
        await this.habilitado(usuario, true);
        identificador(id, 'id');
        const original = await this.repo.findOne(id);
        if (!original) throw new NotFoundException('Solicitud de recurso no encontrada.');
        const result = await this.tickets.transaction(original.ticketId, async (repo) => {
            const anterior = await repo.findRecurso(id);
            if (!anterior) throw new NotFoundException('Solicitud de recurso no encontrada.');
            const ticket = await this.acceso.obtener(anterior.ticketId, usuario, repo);
            const nuevo = aplicarCambios(anterior, body);
            const { id: _id, ticketId: _ticketId, ...datos } = nuevo;
            await repo.updateRecurso(id, datos);
            const ahora = Temporal.Now.plainDateTimeISO();
            const historial = (accion: string, valorAnterior: unknown, valorNuevo: unknown, descripcion: string) => repo.historial({
                ticketId: ticket.id, usuarioId: usuario.usuarioId, accion, valorAnterior: normalizar(valorAnterior),
                valorNuevo: normalizar(valorNuevo), descripcion, fechaCreacion: ahora } as HistorialNuevo);
            for (const [campo, accion, descripcion] of CAMBIOS) {
                if (normalizar(anterior[campo]) !== normalizar(nuevo[campo])) {
                    await historial(accion, anterior[campo], nuevo[campo], campo === 'estadoRecurso' ? DESCRIPCIONES[estado(nuevo)] ?? descripcion : descripcion);
                }
            }
            if (estado(nuevo) === 'CERRADO' && (anterior.estadoRecurso?.trim().toUpperCase() ?? '') !== 'CERRADO') {
                const previo = ticket.estado;
                const cambios = { estado: 'CERRADO', fechaActualizacion: ahora,
                    fechaResolucion: ticket.fechaResolucion ?? ahora, fechaCierre: ticket.fechaCierre ?? ahora };
                await repo.update(ticket.id, cambios as TicketCambios);
                Object.assign(ticket, cambios);
                await historial('CIERRE_TICKET_RECURSO', previo, 'CERRADO', 'El ticket se cerró automáticamente al finalizar la solicitud de recurso externo.');
            }
            return { solicitud: { ...nuevo, ticket }, anterior: anterior.estadoRecurso };
        });
        if (normalizar(result.anterior) !== normalizar(result.solicitud.estadoRecurso)) {
            try { await this.notificaciones.notificarCambioEstadoRecurso(result.solicitud, result.anterior, result.solicitud.estadoRecurso); }
            catch { this.logger.warn('No se pudo enviar la notificación del recurso.'); }
        }
        return solicitudDTO(result.solicitud);
    }
}
