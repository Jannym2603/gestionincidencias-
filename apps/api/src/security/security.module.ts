import { Module } from '@nestjs/common';

import 'dotenv/config';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { AccesoProyectoService } from './acceso-proyecto.service.js';
import { IdentidadService } from './identidad.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env['JWT_SECRET'];
        if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET no esta configurado.');
        }
        return {
          secret,
          signOptions: { expiresIn: '8h' as const },
        };
      },
    }),
  ],

  providers: [
    AccesoProyectoService,
    JwtAuthGuard,
    IdentidadService,
    RolesGuard,
  ],

  exports: [
    AccesoProyectoService,
    JwtAuthGuard,
    IdentidadService,
    RolesGuard,
    JwtModule,
  ],
})
export class SecurityModule {}
