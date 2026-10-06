import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { ProyectosController } from './proyectos.controller.js';
import { ProyectosService } from './proyectos.service.js';
import { AdministracionModule } from '../administracion/administracion.module.js';

@Module({
  imports: [SecurityModule, AdministracionModule],
  controllers: [ProyectosController],
  providers: [ProyectosService],
})
export class ProyectosModule {}
