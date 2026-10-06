import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdministracionService } from '../administracion/administracion.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { identificador } from '../tickets/tickets.dto.js';
@Controller('api/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class UsuariosController {
    constructor(private readonly servicio: AdministracionService) {}
    @Get('me') @Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
    perfil(@Req() req: { user: UsuarioAutenticado }) { return this.servicio.perfil(req.user); }
    @Get() listar() { return this.servicio.usuarios(); }
    @Post() crear(@Body() body: unknown, @Req() req: { user: UsuarioAutenticado }) { return this.servicio.guardarUsuario(null, body, req.user); }
    @Put(':id') actualizar(@Param('id') id: string, @Body() body: unknown, @Req() req: { user: UsuarioAutenticado }) { return this.servicio.guardarUsuario(identificador(Number(id), 'id'), body, req.user); }
    @Put(':id/estado') estado(@Param('id') id: string, @Body() body: unknown, @Req() req: { user: UsuarioAutenticado }) { return this.servicio.estadoUsuario(identificador(Number(id), 'id'), body, req.user); }
}
