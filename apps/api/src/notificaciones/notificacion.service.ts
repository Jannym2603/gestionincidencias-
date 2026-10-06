import { Injectable, Logger } from '@nestjs/common';
import { CorreoSmtpService } from './correo-smtp.service.js';
import type { TicketCompleto } from '../tickets/tickets.repository.js';
import type { SolicitudCompleta } from '../solicitudes-recursos/solicitudes-recursos.repository.js';
import { normalizar } from '../solicitudes-recursos/solicitudes-recursos.rules.js';
import type { Temporal } from 'temporal-polyfill';

@Injectable()
export class NotificacionService {
    private readonly logger = new Logger(NotificacionService.name);
    // application.properties defines app.mail.soporte as SUPPORT_EMAIL or blank;
    // therefore its @Value MAIL_USERNAME fallback is not reached in Spring Boot.
    private readonly soporte = process.env['SUPPORT_EMAIL'] ?? '';
    private readonly copiarSoporte = (process.env['MAIL_COPY_SUPPORT'] ?? 'false').toLowerCase() === 'true';

    constructor(private readonly correo: CorreoSmtpService) {}

    async enviar(destinatario: string | null | undefined, asunto: string, contenido: string, copiarSoporte = true): Promise<boolean> {
        if (!destinatario?.trim()) return false;
        try {
            const soporte = this.soporte.trim() ? this.soporte : undefined;
            return await this.correo.enviar({
                to: destinatario, subject: asunto, text: contenido,
                ...(soporte ? { from: soporte, replyTo: soporte } : {}),
                ...(soporte && copiarSoporte && this.copiarSoporte && soporte.toLowerCase() !== destinatario.toLowerCase() ? { bcc: soporte } : {}),
            });
        } catch {
            this.logger.warn('No se pudo enviar la notificación por correo.');
            return false;
        }
    }

    notificarTicketCreado(t: TicketCompleto) {
        return this.enviar(t.cliente.correo, `Ticket creado: ${t.numeroTicket}`,
            `Tu ticket fue creado correctamente.\n\nNúmero: ${t.numeroTicket}\nTítulo: ${t.titulo}\nEstado: ${t.estado}\nPrioridad recomendada: ${t.prioridad}`);
    }

    notificarEnlaceCompartido(destinatario: string, t: TicketCompleto, creador: string, expiracion: Temporal.PlainDateTime | null, url: string) {
        const fecha = expiracion?.toString({ smallestUnit: 'minute' }).replace('T', ' ') ?? 'Sin fecha de vencimiento';
        return this.enviar(destinatario, `Ticket compartido: ${t.numeroTicket}`,
            `Hola,\n\n${creador} compartió contigo un ticket del sistema de gestión de incidencias.\n\nNúmero: ${t.numeroTicket}\nTítulo: ${t.titulo}\nEstado actual: ${t.estado}\nPrioridad: ${t.prioridad}\nPermisos autorizados: ver el ticket\nVencimiento: ${fecha}\n\nAbre el ticket desde el siguiente enlace:\n${url}\n\nEste enlace es personal. No lo compartas con otras personas.`, false);
    }

    async notificarTicketAsignado(t: TicketCompleto) {
        const agente = t.agenteAsignado;
        if (!agente) return;
        await this.enviar(t.cliente.correo, `Ticket asignado: ${t.numeroTicket}`,
            `Tu ticket fue asignado a un agente.\n\nNúmero: ${t.numeroTicket}\nTítulo: ${t.titulo}\nEstado actual: ${t.estado}\nAgente asignado: ${agente.nombre} ${agente.apellido}`);
        await this.enviar(agente.correo, `Nuevo ticket asignado: ${t.numeroTicket}`,
            `Se te asignó un nuevo ticket.\n\nNúmero: ${t.numeroTicket}\nTítulo: ${t.titulo}\nCliente: ${t.cliente.nombre} ${t.cliente.apellido}\nPrioridad: ${t.prioridad}\nEstado actual: ${t.estado}`);
    }

    notificarCambioEstado(t: TicketCompleto, anterior: string, nuevo: string, nota: string | null) {
        return this.enviar(t.cliente.correo, `Actualización de estado: ${t.numeroTicket}`,
            `Tu ticket cambió de estado.\n\nNúmero: ${t.numeroTicket}\nTítulo: ${t.titulo}\nEstado anterior: ${anterior}\nEstado actual: ${nuevo}${nota?.trim() ? `\n\nNota: ${nota}` : ''}`);
    }

    notificarComentarioPublico(t: TicketCompleto, contenido: string) {
        return this.enviar(t.cliente.correo, `Nuevo comentario en ${t.numeroTicket}`,
            `Se agregó un comentario público al ticket ${t.numeroTicket}.\n\n${contenido}`);
    }

    notificarCodigoRecuperacionPassword(usuario: { correo: string; nombre: string }, codigo: string) {
        return this.enviar(usuario.correo, 'Código para restablecer tu contraseña',
            `Hola ${usuario.nombre},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nTu código de recuperación es: ${codigo}\n\nEste código vence en 10 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`, false);
    }

    notificarCambioEstadoRecurso(s: SolicitudCompleta, anterior: string | null, nuevo: string) {
        const mensajes: Record<string, [string, string]> = {
            EN_VALIDACION: ['Solicitud de recurso en validación: ', 'Tu solicitud de recurso se encuentra en proceso de validación.'],
            SOLICITADO_PROVEEDOR: ['Recurso solicitado al proveedor: ', 'El recurso requerido ya fue solicitado al proveedor.'],
            ESPERANDO_PROVEEDOR: ['Recurso en espera del proveedor: ', 'La solicitud está a la espera de la entrega por parte del proveedor.'],
            RECIBIDO: ['Recurso recibido: ', 'El recurso fue recibido del proveedor y continuará con el proceso de entrega.'],
            ENTREGADO: ['Recurso entregado: ', 'El recurso asociado a tu solicitud fue registrado como entregado.'],
            CERRADO: ['Solicitud de recurso cerrada: ', 'La solicitud de recurso fue cerrada correctamente.'],
            CANCELADO: ['Solicitud de recurso cancelada: ', 'La solicitud de recurso fue cancelada.'],
        };
        const mensaje = mensajes[nuevo.trim().toUpperCase()];
        if (!mensaje || !s.ticket?.cliente) return Promise.resolve(false);
        const t = s.ticket;
        const valor = (v: unknown, fallback: string) => normalizar(v) ?? fallback;
        return this.enviar(t.cliente.correo, `${mensaje[0]}${t.numeroTicket}`,
            `${mensaje[1]}\n\nTicket: ${t.numeroTicket}\nTítulo: ${t.titulo}\nRecurso: ${valor(s.recurso, 'Sin especificar')}\nCantidad: ${s.cantidad ?? 1}\nEstado anterior: ${valor(anterior, '-')}\nEstado actual: ${valor(nuevo, '-')}${s.fechaEstimadaEntrega ? `\nFecha estimada de entrega: ${valor(s.fechaEstimadaEntrega, '-')}` : ''}`);
    }

    notificarRecursoRetrasado(s: SolicitudCompleta) {
        if (!s.ticket || !this.soporte.trim()) return Promise.resolve(false);
        const t = s.ticket;
        const valor = (v: unknown, fallback: string) => normalizar(v) ?? fallback;
        const cliente = t.cliente ? `${t.cliente.nombre ?? ''} ${t.cliente.apellido ?? ''}`.trim() : 'Sin cliente';
        return this.enviar(this.soporte, `ALERTA: recurso retrasado - ${valor(t.numeroTicket, 'Ticket')}`,
            `Se detectó una solicitud de recurso con entrega vencida.\n\nTicket: ${valor(t.numeroTicket, '-')}\nTítulo: ${valor(t.titulo, '-')}\nCliente: ${cliente}\nProyecto: ${t.proyecto ? t.proyecto.nombre : 'Sin proyecto'}\nRecurso: ${valor(s.recurso, '-')}\nCantidad: ${valor(s.cantidad, '1')}\nProveedor: ${valor(s.proveedor, 'Pendiente')}\nEstado del recurso: ${valor(s.estadoRecurso, 'NUEVO')}\nFecha estimada de entrega: ${valor(s.fechaEstimadaEntrega, '-')}\n\nLa solicitud continúa con su estado real; RETRASADO es únicamente una condición de seguimiento.`, false);
    }
}
