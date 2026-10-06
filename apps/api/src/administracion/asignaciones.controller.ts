import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { identificador } from '../tickets/tickets.dto.js';
import { AdministracionService } from './administracion.service.js';
type Peticion = { user: UsuarioAutenticado };
@Controller('api/usuario-proyectos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class UsuarioProyectosController {
    constructor(private readonly servicio: AdministracionService) {}
    @Get() listar(@Req() req: Peticion) { return this.servicio.asignaciones(req.user); }
    @Get('mis-proyectos') @Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
    propias(@Req() req: Peticion) { return this.servicio.asignaciones(req.user, { propias: true }); }
    @Get('usuario/:usuarioId/todas') todas(@Param('usuarioId') id: string, @Req() req: Peticion) { return this.servicio.asignaciones(req.user, { usuarioId: identificador(Number(id), 'usuarioId'), todas: true }); }
    @Get('usuario/:usuarioId') @Roles('ADMIN', 'SUPERVISOR', 'CLIENTE')
    usuario(@Param('usuarioId') id: string, @Req() req: Peticion) { return this.servicio.asignaciones(req.user, { usuarioId: identificador(Number(id), 'usuarioId') }); }
    @Get('proyecto/:proyectoId') proyecto(@Param('proyectoId') id: string, @Req() req: Peticion) { return this.servicio.asignaciones(req.user, { proyectoId: identificador(Number(id), 'proyectoId') }); }
    @Post() crear(@Body() body: unknown, @Req() req: Peticion) { return this.servicio.asignar(body, req.user); }
    @Put(':id/activar') activar(@Param('id') id: string, @Req() req: Peticion) { return this.servicio.estadoAsignacion(identificador(Number(id), 'id'), true, req.user); }
    @Put(':id/desactivar') desactivar(@Param('id') id: string, @Req() req: Peticion) { return this.servicio.estadoAsignacion(identificador(Number(id), 'id'), false, req.user); }
}
@Controller('api/usuario-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class UsuarioRolesController {
    constructor(private readonly servicio: AdministracionService) {}
    @Get() listar() { return this.servicio.usuarioRoles(); }
}
