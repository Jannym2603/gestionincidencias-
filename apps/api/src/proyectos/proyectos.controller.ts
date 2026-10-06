import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AdministracionService } from '../administracion/administracion.service.js';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { ProyectosService } from './proyectos.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';

@Controller('api/proyectos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService, private readonly administracion: AdministracionService) {}

  @Get('activos') @Roles('ADMIN', 'SUPERVISOR')
  activos() { return this.administracion.proyectos(null, true); }
  @Get('compania/:companiaId/activos') @Roles('ADMIN', 'SUPERVISOR')
  activosCompania(@Param('companiaId', ParseIntPipe) id: number) { return this.administracion.proyectos(id, true); }
  @Get('compania/:companiaId') @Roles('ADMIN', 'SUPERVISOR')
  compania(@Param('companiaId', ParseIntPipe) id: number) { return this.administracion.proyectos(id); }
  @Post() @Roles('ADMIN') crear(@Body() body: unknown) { return this.administracion.guardarProyecto(null, body); }
  @Put(':id') @Roles('ADMIN') actualizar(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) { return this.administracion.guardarProyecto(id, body); }
  @Put(':id/estado') @Roles('ADMIN') estado(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) { return this.administracion.estadoProyecto(id, body); }

  @Get()
  findAll(@Req() request: Request & { user: UsuarioAutenticado }) {
    return this.proyectosService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request & { user: UsuarioAutenticado }) {
    return this.proyectosService.findOne(id, request.user);
  }
}
