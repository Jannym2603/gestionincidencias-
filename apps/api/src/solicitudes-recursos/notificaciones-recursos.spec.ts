import { vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { solicitudesFixture } from '../../test/solicitudes-recursos-fixture.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { CorreoSmtpService } from '../notificaciones/correo-smtp.service.js';

describe('Correos de recursos como Spring Boot', () => {
    const enviar = vi.fn(async (_mensaje: Record<string, unknown>) => true);
    let service: NotificacionService;
    beforeEach(() => {
        enviar.mockReset().mockResolvedValue(true);
        vi.stubEnv('SUPPORT_EMAIL', 'soporte@example.test');
        vi.stubEnv('MAIL_COPY_SUPPORT', 'true');
        service = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
    });
    afterEach(() => vi.unstubAllEnvs());
    it.each([
        ['EN_VALIDACION', 'Solicitud de recurso en validación: ', 'Tu solicitud de recurso se encuentra en proceso de validación.'],
        ['SOLICITADO_PROVEEDOR', 'Recurso solicitado al proveedor: ', 'El recurso requerido ya fue solicitado al proveedor.'],
        ['ESPERANDO_PROVEEDOR', 'Recurso en espera del proveedor: ', 'La solicitud está a la espera de la entrega por parte del proveedor.'],
        ['RECIBIDO', 'Recurso recibido: ', 'El recurso fue recibido del proveedor y continuará con el proceso de entrega.'],
        ['ENTREGADO', 'Recurso entregado: ', 'El recurso asociado a tu solicitud fue registrado como entregado.'],
        ['CERRADO', 'Solicitud de recurso cerrada: ', 'La solicitud de recurso fue cerrada correctamente.'],
        ['CANCELADO', 'Solicitud de recurso cancelada: ', 'La solicitud de recurso fue cancelada.'],
    ])('%s asunto, texto, cliente y copia exactos', async (estado, asunto, mensaje) => {
        const f = solicitudesFixture();
        f.solicitud.fechaEstimadaEntrega = Temporal.PlainDateTime.from('2026-10-08T12:00');
        await service.notificarCambioEstadoRecurso(f.completa(f.solicitud), 'NUEVO', estado);
        expect(enviar).toHaveBeenCalledWith({ to: 'cliente@example.test', from: 'soporte@example.test', replyTo: 'soporte@example.test',
            bcc: 'soporte@example.test', subject: `${asunto}INC-2026-0001`,
            text: `${mensaje}\n\nTicket: INC-2026-0001\nTítulo: Ticket\nRecurso: Monitor\nCantidad: 1\nEstado anterior: NUEVO\nEstado actual: ${estado}\nFecha estimada de entrega: 2026-10-08T12:00` });
    });
    it('NUEVO o estado desconocido no envia', async () => {
        const f = solicitudesFixture();
        await service.notificarCambioEstadoRecurso(f.completa(f.solicitud), null, 'NUEVO');
        await service.notificarCambioEstadoRecurso(f.completa(f.solicitud), null, 'RETRASADO');
        expect(enviar).not.toHaveBeenCalled();
    });
    it('alerta interna soporte sin copia, texto y fallbacks exactos', async () => {
        const f = solicitudesFixture();
        expect(await service.notificarRecursoRetrasado(f.completa(f.solicitud))).toBe(true);
        expect(enviar).toHaveBeenCalledWith({ to: 'soporte@example.test', from: 'soporte@example.test', replyTo: 'soporte@example.test',
            subject: 'ALERTA: recurso retrasado - INC-2026-0001',
            text: 'Se detectó una solicitud de recurso con entrega vencida.\n\nTicket: INC-2026-0001\nTítulo: Ticket\nCliente: Cliente Prueba\nProyecto: Proyecto\nRecurso: Monitor\nCantidad: 1\nProveedor: Pendiente\nEstado del recurso: NUEVO\nFecha estimada de entrega: -\n\nLa solicitud continúa con su estado real; RETRASADO es únicamente una condición de seguimiento.' });
    });
    it('sin soporte alerta false; SMTP falla false sin credenciales expuestas', async () => {
        const f = solicitudesFixture();
        vi.stubEnv('SUPPORT_EMAIL', '');
        const sinSoporte = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        expect(await sinSoporte.notificarRecursoRetrasado(f.completa(f.solicitud))).toBe(false);
        expect(enviar).not.toHaveBeenCalled();
        enviar.mockRejectedValueOnce(new Error('SMTP simulado'));
        await expect(service.notificarRecursoRetrasado(f.completa(f.solicitud))).resolves.toBe(false);
    });
});
