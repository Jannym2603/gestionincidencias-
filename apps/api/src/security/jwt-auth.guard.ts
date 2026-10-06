import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { IdentidadService } from './identidad.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly identidad: IdentidadService) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException(
        'Token requerido.',
      );
    }

    const bearer = typeof authHeader === 'string'
      ? /^Bearer ([^\s]+)$/i.exec(authHeader)
      : null;

    if (!bearer) {
      throw new UnauthorizedException(
        'Token invalido.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(
        bearer[1],
      );

      request.user = await this.identidad.resolver(payload);

      return true;
    } catch {
      throw new UnauthorizedException(
        'Token invalido o expirado.',
      );
    }
  }
}
