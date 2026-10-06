import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { EnlacesCompartidosController, TicketCompartidoController } from './enlaces-compartidos.controller.js';
import { EnlacesCompartidosService } from './enlaces-compartidos.service.js';
import { EnlacesCompartidosRepository } from './enlaces-compartidos.repository.js';

@Module({ imports: [SecurityModule, TicketsModule, NotificacionesModule],
    controllers: [EnlacesCompartidosController, TicketCompartidoController],
    providers: [EnlacesCompartidosService, EnlacesCompartidosRepository] })
export class EnlacesCompartidosModule {}
