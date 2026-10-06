import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { ComentariosController } from './comentarios.controller.js';
import { ComentariosService } from './comentarios.service.js';
import { ComentariosRepository } from './comentarios.repository.js';
@Module({ imports: [SecurityModule, TicketsModule, NotificacionesModule], controllers: [ComentariosController], providers: [ComentariosService, ComentariosRepository] })
export class ComentariosModule {}
