import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesRepository } from './reportes.repository.js';
import { ReportesService } from './reportes.service.js';

@Module({ imports: [SecurityModule, TicketsModule], controllers: [ReportesController], providers: [ReportesRepository, ReportesService] })
export class ReportesModule {}
