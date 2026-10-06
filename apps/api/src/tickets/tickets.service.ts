import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { TicketsRepository } from './tickets.repository.js';
import type { TicketCompleto, TicketCambios, TicketNuevo, HistorialNuevo, RecursoNuevo } from './tickets.repository.js';
import { crearTicketDTO, identificador, objeto, opcional, texto } from './tickets.dto.js';
import { cumplido, fechasSla, prioridad, ticketDTO, validarTransicion } from './tickets.rules.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { obtenerTicketPermitido } from './acceso-ticket.service.js';

@Injectable()
export class TicketsService {
    private readonly logger = new Logger(TicketsService.name);
    constructor(private readonly repo: TicketsRepository, private readonly acceso: AccesoProyectoService,
        private readonly configuracion: ConfiguracionSistemaService, private readonly notificaciones: NotificacionService) {}

    private async notificar(enviar: () => Promise<unknown>) {
        try { await enviar(); }
        catch { this.logger.warn('No se pudo enviar la notificación del ticket.'); }
    }

    async findAll(usuario: UsuarioAutenticado) {
        const ids = await this.acceso.obtenerIdsPermitidos(usuario);
        const tickets = await this.repo.findAll(ids, usuario.usuarioId, usuario.rol);
        return Promise.all(tickets.map((t) => this.respuesta(this.repo, t)));
    }

    private async autorizado(repo: TicketsRepository, id: number, usuario: UsuarioAutenticado) {
        try { return await obtenerTicketPermitido(repo, id, usuario, this.acceso); }
        catch (error) { if (error instanceof NotFoundException) throw new BadRequestException('Ticket no encontrado.'); throw error; }
    }

    private sla(ticket: TicketCompleto, valor: string = ticket.prioridad): TicketCambios {
        const fechaCreacion = ticket.fechaCreacion ?? Temporal.Now.plainDateTimeISO();
        const fechas = fechasSla(valor, fechaCreacion, ticket.tipoAtencion?.toUpperCase() === 'RECURSO_EXTERNO');
        return { fechaCreacion, ...fechas,
            slaRespuestaCumplido: cumplido(ticket.fechaPrimeraRespuesta, fechas.fechaLimiteRespuesta),
            slaResolucionCumplido: cumplido(ticket.fechaResolucion, fechas.fechaLimiteResolucion) };
    }

    private async respuesta(repo: TicketsRepository, ticket: TicketCompleto) {
        if (!ticket.fechaLimiteRespuesta || (ticket.tipoAtencion?.toUpperCase() !== 'RECURSO_EXTERNO' && !ticket.fechaLimiteResolucion)) {
            const cambios = this.sla(ticket);
            await repo.update(ticket.id, cambios);
            Object.assign(ticket, cambios);
        }
        return ticketDTO(ticket);
    }

    async findOne(id: number, usuario: UsuarioAutenticado) {
        return this.respuesta(this.repo, await this.autorizado(this.repo, id, usuario));
    }

    private historial(repo: TicketsRepository, id: number, usuario: UsuarioAutenticado, accion: string,
        anterior: string | null, nuevo: string, descripcion: string) {
        return repo.historial({ ticketId: id, usuarioId: usuario.usuarioId, accion, valorAnterior: anterior,
            valorNuevo: nuevo, descripcion, fechaCreacion: Temporal.Now.plainDateTimeISO() } as HistorialNuevo);
    }

    async create(value: unknown, usuario: UsuarioAutenticado) {
        const data = crearTicketDTO(value);
        await this.acceso.obtenerIdsPermitidos(usuario);
        const config = await this.configuracion.obtenerOCrear();
        let notificado: TicketCompleto;
        const resultado = await this.repo.transaction(null, async (repo) => {
            const permiso = { CLIENTE: config?.crearTicketCliente, AGENTE: config?.crearTicketAgente,
                SUPERVISOR: config?.crearTicketSupervisor, ADMIN: true }[usuario.rol];
            if (config && (!config.crearTicketActivo || !permiso)) throw new ForbiddenException('No tienes permisos para crear tickets.');
            const tipo = await repo.findTipo(data.tipoIncidenciaId);
            const cliente = await repo.findUsuario(data.clienteId);
            const proyecto = await repo.findProyecto(data.proyectoId);
            if (!tipo) throw new BadRequestException('Tipo de incidencia no encontrado.');
            if (!cliente) throw new BadRequestException('Cliente no encontrado.');
            if (!proyecto) throw new BadRequestException('Proyecto no encontrado.');
            if (usuario.rol === 'CLIENTE' && cliente.id !== usuario.usuarioId) {
                throw new ForbiddenException('Un cliente solo puede registrar tickets a su propio nombre.');
            }
            if ((await repo.findRol(cliente.id))?.rol.nombre !== 'CLIENTE' || !cliente.estado) {
                throw new BadRequestException('El cliente debe estar activo y tener rol CLIENTE.');
            }
            if (!proyecto.estado || !proyecto.compania?.estado) throw new ForbiddenException('Proyecto o compania no disponible.');
            if (['SUPERVISOR', 'AGENTE'].includes(usuario.rol)) await this.acceso.validarAccesoProyecto(usuario, proyecto.id);
            try { await this.acceso.validarAccesoProyecto({ usuarioId: cliente.id, rol: 'CLIENTE' }, proyecto.id); }
            catch (error) { if (error instanceof ForbiddenException) throw new BadRequestException('El cliente no tiene acceso al proyecto seleccionado.'); throw error; }
            const ahora = Temporal.Now.plainDateTimeISO();
            const valor = prioridad(data.impacto, data.urgencia);
            const { solicitudRecurso, ...campos } = data;
            const ticket = await repo.create({ ...campos, numeroTicket: await repo.numeroTicket(ahora.year),
                agenteAsignadoId: null, estado: 'NUEVO', prioridad: valor, fechaCreacion: ahora,
                fechaActualizacion: ahora, fechaResolucion: null, fechaCierre: null, fechaPrimeraRespuesta: null,
                slaRespuestaCumplido: null, slaResolucionCumplido: null,
                ...fechasSla(valor, ahora, data.tipoAtencion === 'RECURSO_EXTERNO') } as TicketNuevo);
            if (data.tipoAtencion === 'RECURSO_EXTERNO' && solicitudRecurso) {
                await repo.recurso({ ...solicitudRecurso, ticketId: ticket.id, estadoRecurso: 'NUEVO',
                    fechaCreacion: ahora, fechaActualizacion: ahora } as RecursoNuevo);
                await this.historial(repo, ticket.id, usuario, 'RECURSO_CREADO', null, 'NUEVO',
                    `Se creó la solicitud de recurso. Categoría: ${solicitudRecurso.categoria}. Recurso: ${solicitudRecurso.recurso}. Cantidad: ${solicitudRecurso.cantidad}. Estado inicial: NUEVO.${solicitudRecurso.observaciones ? ` Observaciones: ${solicitudRecurso.observaciones}.` : ''}`);
            }
            await this.historial(repo, ticket.id, usuario, 'CREACION_TICKET', null, 'NUEVO',
                `Se creó el ticket ${ticket.numeroTicket} en el proyecto ${proyecto.nombre}. Tipo de atención: ${data.tipoAtencion}`);
            notificado = (await repo.findOne(ticket.id))!;
            return this.respuesta(repo, notificado);
        });
        await this.notificar(() => this.notificaciones.notificarTicketCreado(notificado!));
        return resultado;
    }

    async asignar(id: number, value: unknown, usuario: UsuarioAutenticado) {
        const agenteId = identificador(objeto(value).agenteId, 'agenteId');
        let notificado: TicketCompleto;
        const resultado = await this.repo.transaction(id, async (repo) => {
            const ticket = await this.autorizado(repo, id, usuario);
            const agente = await repo.findUsuario(agenteId);
            if (!agente) throw new BadRequestException('Agente no encontrado.');
            if (!agente.estado || (await repo.findRol(agenteId))?.rol.nombre !== 'AGENTE') {
                throw new BadRequestException('El agente debe estar activo y tener rol AGENTE.');
            }
            const proyecto = await repo.findProyecto(ticket.proyectoId);
            if (!proyecto?.estado || !proyecto.compania?.estado) throw new ForbiddenException('Proyecto o compania no disponible.');
            try { await this.acceso.validarAccesoProyecto({ usuarioId: agenteId, rol: 'AGENTE' }, ticket.proyectoId); }
            catch (error) { if (error instanceof ForbiddenException) throw new BadRequestException('El agente no tiene acceso al proyecto del ticket.'); throw error; }
            if (ticket.agenteAsignadoId === null && ticket.estado !== 'NUEVO') {
                throw new BadRequestException('Solo se puede realizar la primera asignación cuando el ticket está en estado NUEVO.');
            }
            const estado = ticket.agenteAsignadoId === null ? 'EN_PROGRESO' : ticket.estado;
            const nombre = `${agente.nombre} ${agente.apellido}`;
            await repo.update(id, { agenteAsignadoId: agenteId, estado, fechaActualizacion: Temporal.Now.plainDateTimeISO() } as TicketCambios);
            await this.historial(repo, id, usuario, 'ASIGNACION_AGENTE', ticket.agenteAsignado ?
                `${ticket.agenteAsignado.nombre} ${ticket.agenteAsignado.apellido}` : 'SIN_ASIGNAR', nombre, `Se asignó el ticket al agente ${nombre}`);
            if (estado !== ticket.estado) await this.historial(repo, id, usuario, 'CAMBIO_ESTADO', ticket.estado, estado,
                'Se cambió el estado automáticamente por la asignación del agente.');
            notificado = (await repo.findOne(id))!;
            return this.respuesta(repo, notificado);
        });
        await this.notificar(() => this.notificaciones.notificarTicketAsignado(notificado!));
        return resultado;
    }

    async estado(id: number, value: unknown, usuario: UsuarioAutenticado) {
        const body = objeto(value);
        const estado = texto(body.estado, 'estado').toUpperCase();
        const nota = opcional(body.notaResolucion, 'notaResolucion');
        let notificado: TicketCompleto;
        let anterior: string;
        const resultado = await this.repo.transaction(id, async (repo) => {
            const ticket = await this.autorizado(repo, id, usuario);
            anterior = ticket.estado;
            validarTransicion(ticket, estado, nota);
            const ahora = Temporal.Now.plainDateTimeISO();
            const cambios = { estado, fechaActualizacion: ahora } as TicketCambios;
            if (estado === 'CERRADO') {
                if (!ticket.fechaResolucion) {
                    const limite = ticket.fechaLimiteResolucion ?? fechasSla(ticket.prioridad, ticket.fechaCreacion ?? ahora, false).fechaLimiteResolucion;
                    cambios.fechaResolucion = ahora;
                    cambios.slaResolucionCumplido = cumplido(ahora, limite);
                }
                cambios.fechaCierre = ticket.fechaCierre ?? ahora;
            }
            await repo.update(id, cambios);
            await this.historial(repo, id, usuario, 'CAMBIO_ESTADO', ticket.estado, estado,
                `Se cambió el estado del ticket de ${ticket.estado} a ${estado}${nota ? `. Nota de cierre: ${nota}` : ''}`);
            notificado = (await repo.findOne(id))!;
            return this.respuesta(repo, notificado);
        });
        await this.notificar(() => this.notificaciones.notificarCambioEstado(notificado!, anterior!, estado, nota));
        return resultado;
    }

    async prioridad(id: number, value: unknown, usuario: UsuarioAutenticado) {
        const body = objeto(value);
        const valor = texto(body.prioridad, 'prioridad').toUpperCase();
        const usuarioId = identificador(body.usuarioId, 'usuarioId');
        const justificacion = opcional(body.justificacion, 'justificacion');
        return this.repo.transaction(id, async (repo) => {
            const ticket = await this.autorizado(repo, id, usuario);
            if (usuarioId !== usuario.usuarioId) throw new ForbiddenException('No puedes registrar el cambio a nombre de otro usuario.');
            await repo.update(id, { prioridad: valor, ...this.sla(ticket, valor), fechaActualizacion: Temporal.Now.plainDateTimeISO() } as TicketCambios);
            await this.historial(repo, id, usuario, 'CAMBIO_PRIORIDAD', ticket.prioridad, valor,
                `Se ajustó manualmente la prioridad de ${ticket.prioridad} a ${valor}${justificacion ? `. Justificación: ${justificacion}` : ''}`);
            return this.respuesta(repo, (await repo.findOne(id))!);
        });
    }
}
