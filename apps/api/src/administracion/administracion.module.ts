import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';
import { AdministracionRepository } from './administracion.repository.js';
import { AdministracionService } from './administracion.service.js';
import { UsuarioProyectosController, UsuarioRolesController } from './asignaciones.controller.js';
@Module({ imports: [SecurityModule], providers: [AdministracionRepository, AdministracionService],
    controllers: [UsuarioProyectosController, UsuarioRolesController], exports: [AdministracionRepository, AdministracionService] })
export class AdministracionModule {}
