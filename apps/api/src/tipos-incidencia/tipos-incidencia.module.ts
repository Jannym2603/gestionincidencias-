import { Module } from '@nestjs/common';
import { TiposIncidenciaController } from './tipos-incidencia.controller.js';
import { TiposIncidenciaService } from './tipos-incidencia.service.js';
import { SecurityModule } from '../security/security.module.js';

@Module({
  imports: [SecurityModule],
  controllers: [TiposIncidenciaController],
  providers: [TiposIncidenciaService],
})
export class TiposIncidenciaModule {}
