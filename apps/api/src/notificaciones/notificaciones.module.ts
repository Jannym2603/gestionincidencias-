import { Module } from '@nestjs/common';
import { CorreoSmtpService } from './correo-smtp.service.js';
import { NotificacionService } from './notificacion.service.js';

@Module({ providers: [CorreoSmtpService, NotificacionService], exports: [NotificacionService] })
export class NotificacionesModule {}
