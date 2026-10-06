import { Module } from '@nestjs/common';
import { carpetasAdjuntos, CARPETAS_ADJUNTOS_LEGACY } from './almacenamiento.js';
import { SecurityModule } from '../security/security.module.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { AdjuntosController, LimiteSolicitudAdjuntoGuard } from './adjuntos.controller.js';
import { AdjuntosService, CARPETA_ADJUNTOS } from './adjuntos.service.js';
import { AdjuntosRepository } from './adjuntos.repository.js';
@Module({ imports: [SecurityModule, TicketsModule], controllers: [AdjuntosController], providers: [AdjuntosService, AdjuntosRepository,
    LimiteSolicitudAdjuntoGuard, { provide: CARPETA_ADJUNTOS, useFactory: () => carpetasAdjuntos().principal },
    { provide: CARPETAS_ADJUNTOS_LEGACY, useFactory: () => carpetasAdjuntos().anteriores }] })
export class AdjuntosModule {}
