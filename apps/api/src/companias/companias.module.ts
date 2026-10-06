import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { CompaniasController } from './companias.controller.js';
import { CompaniasService } from './companias.service.js';
import { AdministracionModule } from '../administracion/administracion.module.js';

@Module({
  imports: [SecurityModule, AdministracionModule],
  controllers: [CompaniasController],
  providers: [CompaniasService],
})
export class CompaniasModule {}
