import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { ConfiguracionSistemaController } from './configuracion-sistema.controller.js';
import { ConfiguracionGestionService } from './configuracion-gestion.service.js';
import { ConfiguracionRepository } from './configuracion.repository.js';

@Module({ imports: [SecurityModule, TicketsModule], controllers: [ConfiguracionSistemaController],
    providers: [ConfiguracionGestionService, ConfiguracionRepository] })
export class ConfiguracionSistemaModule {}
