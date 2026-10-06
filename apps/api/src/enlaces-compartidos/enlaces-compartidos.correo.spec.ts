import { vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import type { CorreoSmtpService } from '../notificaciones/correo-smtp.service.js';
import type { TicketCompleto } from '../tickets/tickets.repository.js';

describe('Correo de enlace compartido', () => {
    it('contenido equivalente y sin copia a soporte', async () => {
        const enviar = vi.fn().mockResolvedValue(true);
        const servicio = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        const espia = vi.spyOn(servicio, 'enviar');
        await servicio.notificarEnlaceCompartido('externo@example.test', { numeroTicket: 'INC-2026-0001', titulo: 'Ticket', estado: 'NUEVO', prioridad: 'P3_MEDIA' } as TicketCompleto,
            'Admin Prueba', Temporal.PlainDateTime.from('2026-10-13T12:30:59'), 'https://example.test/ticket-compartido.html?token=seguro');
        expect(espia).toHaveBeenCalledWith('externo@example.test', 'Ticket compartido: INC-2026-0001', expect.stringContaining('Permisos autorizados: ver el ticket\nVencimiento: 2026-10-13 12:30'), false);
        expect(enviar.mock.calls[0]![0]).not.toHaveProperty('bcc');
    });
    it('fallo SMTP devuelve false sin propagar credenciales', async () => {
        const servicio = new NotificacionService({ enviar: vi.fn().mockRejectedValue(new Error('SMTP credencial privada')) } as unknown as CorreoSmtpService);
        await expect(servicio.notificarEnlaceCompartido('externo@example.test', { numeroTicket: 'INC-2026-0001' } as TicketCompleto, 'Admin', null, 'https://example.test')).resolves.toBe(false);
    });
});
