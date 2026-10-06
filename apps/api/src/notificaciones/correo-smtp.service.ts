import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class CorreoSmtpService implements OnModuleDestroy {
    private readonly logger = new Logger(CorreoSmtpService.name);
    private readonly transporte: Transporter | undefined;

    constructor() {
        const user = process.env['MAIL_USERNAME'];
        const pass = process.env['MAIL_PASSWORD'];
        if (!user?.trim() || !pass?.trim()) return;
        try {
            // Creating the transport never verifies/connects to SMTP at startup.
            this.transporte = nodemailer.createTransport({
                host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true,
                auth: { user, pass }, tls: { servername: 'smtp.gmail.com' },
                connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000, dnsTimeout: 10000,
                logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
            });
        } catch {
            this.logger.warn('No se pudo configurar el correo. La API continuará sin notificaciones.');
        }
    }

    async enviar(mensaje: SendMailOptions): Promise<boolean> {
        if (!this.transporte) return false;
        try {
            await this.transporte.sendMail(mensaje);
            return true;
        } catch {
            // SMTP exceptions may contain credentials, addresses or message content.
            this.logger.warn('No se pudo enviar la notificación por correo.');
            return false;
        }
    }

    onModuleDestroy() { this.transporte?.close(); }
}
