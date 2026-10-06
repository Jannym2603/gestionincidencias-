import { vi } from 'vitest';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { CorreoSmtpService } from '../notificaciones/correo-smtp.service.js';

describe('Correo de recuperacion exacto Spring Boot', () => {
    const enviar = vi.fn(async (_mensaje: Record<string, unknown>) => true);
    afterEach(() => vi.unstubAllEnvs());
    it('codigo por correo al usuario, asunto/texto exactos y sin BCC a soporte', async () => {
        enviar.mockReset().mockResolvedValue(true);
        vi.stubEnv('SUPPORT_EMAIL', 'soporte@example.test');
        vi.stubEnv('MAIL_COPY_SUPPORT', 'true');
        const service = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        await service.notificarCodigoRecuperacionPassword({ correo: 'usuario@example.test', nombre: 'Usuario' }, '012345');
        expect(enviar).toHaveBeenCalledWith({ to: 'usuario@example.test', from: 'soporte@example.test', replyTo: 'soporte@example.test',
            subject: 'Código para restablecer tu contraseña',
            text: 'Hola Usuario,\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nTu código de recuperación es: 012345\n\nEste código vence en 10 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.' });
    });
    it('error SMTP se captura sin devolver datos sensibles', async () => {
        enviar.mockReset().mockRejectedValueOnce(new Error('SMTP simulado'));
        const service = new NotificacionService({ enviar } as unknown as CorreoSmtpService);
        await expect(service.notificarCodigoRecuperacionPassword({ correo: 'usuario@example.test', nombre: 'Usuario' }, '012345')).resolves.toBe(false);
    });
});
