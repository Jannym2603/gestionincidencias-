import { Body, Controller, Get, Param, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { SolicitudesRecursosService } from './solicitudes-recursos.service.js';
type Peticion = Request & { user: UsuarioAutenticado };

@Controller('api/solicitudes-recursos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class SolicitudesRecursosController {
    constructor(private readonly solicitudes: SolicitudesRecursosService) {}
    @Get()
    findAll(@Req() req: Peticion) { return this.solicitudes.findAll(req.user); }
    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId', ParseIntPipe) id: number, @Req() req: Peticion) { return this.solicitudes.findByTicket(id, req.user); }
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Peticion) { return this.solicitudes.findOne(id, req.user); }
    @Put(':id')
    @Roles('ADMIN', 'SUPERVISOR')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() req: Peticion) { return this.solicitudes.update(id, body, req.user); }
}
