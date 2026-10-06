import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketsRepository } from './tickets.repository.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { AccesoTicketService } from './acceso-ticket.service.js';

@Module({ imports: [SecurityModule, NotificacionesModule], controllers: [TicketsController], providers: [TicketsService, TicketsRepository, ConfiguracionSistemaService, AccesoTicketService],
    exports: [TicketsRepository, ConfiguracionSistemaService, AccesoTicketService] })
export class TicketsModule {}
