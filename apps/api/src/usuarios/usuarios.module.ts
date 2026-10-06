import { Module } from '@nestjs/common';

import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

import { SecurityModule } from '../security/security.module.js';
import { AdministracionModule } from '../administracion/administracion.module.js';

@Module({
  imports: [
    SecurityModule,
    AdministracionModule,
  ],

  controllers: [
    UsuariosController,
  ],

  providers: [
    UsuariosService,
  ],
})
export class UsuariosModule {}
