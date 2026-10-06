import { vi } from 'vitest';
import { NotificacionService } from './notificacion.service.js';
import { CorreoSmtpService } from './correo-smtp.service.js';
import { ticketsFixture } from '../../test/tickets-fixture.js';

describe('Notificaciones de Tickets como Spring Boot', () => {
    const enviar = vi.fn(async (_mensaje: Record<string, unknown>) => true);
    let servicio: NotificacionService;
    beforeEach(() => {
        enviar.mockReset().mockResolvedValue(true);
        vi.stubEnv('SUPPORT_EMAIL', 'soporte@example.test');
        vi.stubEnv('MAIL_COPY_SUPPORT', 'true');
        servicio = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
    });
    afterEach(() => vi.unstubAllEnvs());
    it('creacion coincide en destinatario, asunto y texto', async () => {
        const { ticket } = ticketsFixture();
        await servicio.notificarTicketCreado(ticket);
        expect(enviar).toHaveBeenCalledWith({ to: 'cliente@example.test', from: 'soporte@example.test',
            replyTo: 'soporte@example.test', bcc: 'soporte@example.test', subject: 'Ticket creado: INC-2026-0001',
            text: 'Tu ticket fue creado correctamente.\n\nNúmero: INC-2026-0001\nTítulo: Ticket\nEstado: NUEVO\nPrioridad recomendada: P3_MEDIA' });
    });
    it('asignacion envia al cliente y al agente, aun si falla el primer envio', async () => {
        const f = ticketsFixture();
        const ticket = { ...f.ticket, agenteAsignado: f.agente } as typeof f.ticket;
        enviar.mockResolvedValueOnce(false);
        await servicio.notificarTicketAsignado(ticket);
        expect(enviar).toHaveBeenCalledTimes(2);
        expect(enviar.mock.calls[0]![0]).toMatchObject({ to: 'cliente@example.test', subject: 'Ticket asignado: INC-2026-0001' });
        expect(enviar.mock.calls[1]![0]).toMatchObject({ to: 'agente@example.test', subject: 'Nuevo ticket asignado: INC-2026-0001',
            text: 'Se te asignó un nuevo ticket.\n\nNúmero: INC-2026-0001\nTítulo: Ticket\nCliente: Cliente Prueba\nPrioridad: P3_MEDIA\nEstado actual: NUEVO' });
    });
    it.each([null, 'Solucionado'])('cambio de estado con nota %s', async (nota) => {
        await servicio.notificarCambioEstado(ticketsFixture().ticket, 'EN_PROGRESO', 'CERRADO', nota);
        expect(enviar.mock.calls[0]![0]).toMatchObject({ subject: 'Actualización de estado: INC-2026-0001',
            text: `Tu ticket cambió de estado.\n\nNúmero: INC-2026-0001\nTítulo: Ticket\nEstado anterior: EN_PROGRESO\nEstado actual: CERRADO${nota ? `\n\nNota: ${nota}` : ''}` });
    });
    it('no envia copia a soporte si ya es el destinatario', async () => {
        await servicio.enviar('SOPORTE@example.test', 'Asunto', 'Texto');
        expect(enviar.mock.calls[0]![0]).not.toHaveProperty('bcc');
    });
    it('MAIL_COPY_SUPPORT desactivado no copia', async () => {
        vi.stubEnv('MAIL_COPY_SUPPORT', 'false');
        servicio = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        await servicio.enviar('cliente@example.test', 'Asunto', 'Texto');
        expect(enviar.mock.calls[0]![0]).not.toHaveProperty('bcc');
    });
    it('SUPPORT_EMAIL vacio no usa MAIL_USERNAME como soporte, igual que application.properties', async () => {
        vi.stubEnv('SUPPORT_EMAIL', '');
        vi.stubEnv('MAIL_USERNAME', 'cuenta@example.test');
        servicio = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        await servicio.enviar('cliente@example.test', 'Asunto', 'Texto');
        expect(enviar.mock.calls[0]![0]).toEqual({ to: 'cliente@example.test', subject: 'Asunto', text: 'Texto' });
    });
    it('permite envio reutilizable sin copia y omite destinatarios vacios', async () => {
        expect(await servicio.enviar(' ', 'Asunto', 'Texto')).toBe(false);
        await servicio.enviar('cliente@example.test', 'Asunto', 'Texto', false);
        expect(enviar).toHaveBeenCalledOnce();
        expect(enviar.mock.calls[0]![0]).not.toHaveProperty('bcc');
    });
    it('rechazo inesperado del adaptador tampoco rompe la operacion', async () => {
        enviar.mockRejectedValueOnce(new Error('simulado'));
        await expect(servicio.enviar('cliente@example.test', 'Asunto', 'Texto')).resolves.toBe(false);
    });
    it('comentario publico conserva destinatario, asunto y contenido de Spring Boot', async () => {
        await servicio.notificarComentarioPublico(ticketsFixture().ticket, 'Respuesta pública');
        expect(enviar.mock.calls[0]![0]).toMatchObject({ to: 'cliente@example.test', subject: 'Nuevo comentario en INC-2026-0001',
            text: 'Se agregó un comentario público al ticket INC-2026-0001.\n\nRespuesta pública' });
    });
});
