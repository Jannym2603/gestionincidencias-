import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { HistorialTicketsController } from './historial-tickets.controller.js';
import { HistorialTicketsService } from './historial-tickets.service.js';
import { HistorialTicketsRepository } from './historial-tickets.repository.js';
@Module({ imports: [SecurityModule, TicketsModule], controllers: [HistorialTicketsController], providers: [HistorialTicketsService, HistorialTicketsRepository] })
export class HistorialTicketsModule {}
