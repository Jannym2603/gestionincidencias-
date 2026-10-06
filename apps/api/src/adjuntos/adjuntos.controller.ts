import { BadRequestException, Controller, Get, Header, HttpCode, Injectable, Param, ParseIntPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { AdjuntosService, TAMANIO_MAXIMO } from './adjuntos.service.js';
import type { ArchivoRecibido } from './adjuntos.service.js';
type Peticion = Request & { user: UsuarioAutenticado };

@Injectable()
export class LimiteSolicitudAdjuntoGuard implements CanActivate {
    canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (Number(req.headers['content-length'] ?? 0) > 12 * 1024 * 1024) throw new BadRequestException('La solicitud supera el tamaño máximo permitido de 12 MB.');
        return true;
    }
}

@Controller('api/adjuntos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class AdjuntosController {
    constructor(private readonly service: AdjuntosService) {}
    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId', ParseIntPipe) id: number, @Req() req: Peticion) { return this.service.findByTicket(id, req.user); }
    @Post('ticket/:ticketId')
    @HttpCode(200)
    @UseGuards(LimiteSolicitudAdjuntoGuard)
    @UseInterceptors(FileInterceptor('archivo', { preservePath: true, limits: { fileSize: TAMANIO_MAXIMO, files: 1, fields: 2, fieldSize: 1024 * 1024 } }))
    upload(@Param('ticketId', ParseIntPipe) id: number, @UploadedFile() archivo: ArchivoRecibido | undefined, @Req() req: Peticion) {
        return this.service.upload(id, archivo, req.user);
    }
    @Get(':id/descargar')
    @Header('X-Content-Type-Options', 'nosniff')
    download(@Param('id', ParseIntPipe) id: number, @Req() req: Peticion) { return this.service.download(id, req.user); }
}
