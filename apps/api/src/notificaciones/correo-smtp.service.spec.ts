import { Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { vi } from 'vitest';
import { CorreoSmtpService } from './correo-smtp.service.js';

describe('Correo SMTP opcional', () => {
    const sendMail = vi.fn(async () => ({ messageId: 'simulado' }));
    const close = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
        sendMail.mockResolvedValue({ messageId: 'simulado' });
        vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail, close } as unknown as Transporter);
        vi.stubEnv('MAIL_USERNAME', 'correo@example.test');
        vi.stubEnv('MAIL_PASSWORD', randomBytes(16).toString('hex'));
    });
    afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

    it.each(['MAIL_USERNAME', 'MAIL_PASSWORD'])('sin %s no configura ni conecta SMTP', async (campo) => {
        vi.stubEnv(campo, '');
        const correo = new CorreoSmtpService();
        expect(await correo.enviar({ to: 'destino@example.test', subject: 'Prueba', text: 'Mensaje' })).toBe(false);
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
        expect(sendMail).not.toHaveBeenCalled();
    });
    it('configura Gmail STARTTLS y timeouts sin enviar al construir el servicio', () => {
        new CorreoSmtpService();
        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true,
            connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000, dnsTimeout: 10000,
            logger: false, debug: false,
        }));
        expect(sendMail).not.toHaveBeenCalled();
    });
    it('envio simulado funciona y cierra transporte al terminar', async () => {
        const correo = new CorreoSmtpService();
        expect(await correo.enviar({ to: 'destino@example.test', text: 'Mensaje' })).toBe(true);
        correo.onModuleDestroy();
        expect(close).toHaveBeenCalledOnce();
    });
    it('absorbe errores SMTP sin registrar credenciales ni su mensaje', async () => {
        const secreto = randomBytes(16).toString('hex');
        sendMail.mockRejectedValueOnce(new Error(secreto));
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        expect(await new CorreoSmtpService().enviar({ to: 'destino@example.test' })).toBe(false);
        expect(warn).toHaveBeenCalledWith('No se pudo enviar la notificación por correo.');
        expect(JSON.stringify(warn.mock.calls)).not.toContain(secreto);
    });
    it('un fallo al construir el transporte no impide iniciar', async () => {
        vi.mocked(nodemailer.createTransport).mockImplementationOnce(() => { throw new Error('simulado'); });
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        expect(await new CorreoSmtpService().enviar({ to: 'destino@example.test' })).toBe(false);
    });
});
