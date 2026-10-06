import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { SolicitudesRecursosController } from './solicitudes-recursos.controller.js';
import { SolicitudesRecursosRepository } from './solicitudes-recursos.repository.js';
import { SolicitudesRecursosService } from './solicitudes-recursos.service.js';
import { AlertaRecursoRetrasadoService } from './alerta-recurso-retrasado.service.js';

@Module({ imports: [SecurityModule, TicketsModule, NotificacionesModule], controllers: [SolicitudesRecursosController],
    providers: [SolicitudesRecursosRepository, SolicitudesRecursosService, AlertaRecursoRetrasadoService] })
export class SolicitudesRecursosModule {}
