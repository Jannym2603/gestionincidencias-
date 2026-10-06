import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';

@Module({
  imports: [SecurityModule, NotificacionesModule],
  controllers: [AuthController],

  providers: [AuthService, AuthRepository],

  exports: [
    AuthService,
  ],
})
export class AuthModule {}
