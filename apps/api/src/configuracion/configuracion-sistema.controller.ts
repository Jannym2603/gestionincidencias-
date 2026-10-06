import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { ConfiguracionGestionService } from './configuracion-gestion.service.js';
import type { UsuarioConfiguracion } from './configuracion-gestion.service.js';

@Controller('api/configuracion-sistema')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracionSistemaController {
    constructor(private readonly configuracion: ConfiguracionGestionService) {}
    @Get()
    obtenerConfiguracion() { return this.configuracion.obtenerConfiguracion(); }
    @Put()
    @Roles('ADMIN')
    actualizarConfiguracion(@Body() body: unknown, @Req() req: Request & { user: UsuarioConfiguracion }) {
        return this.configuracion.actualizarConfiguracion(body, req.user);
    }
    @Get('auditoria')
    @Roles('ADMIN')
    obtenerAuditoria() { return this.configuracion.obtenerAuditoria(); }
}
