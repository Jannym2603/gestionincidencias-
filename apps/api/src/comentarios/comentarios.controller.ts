import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { ComentariosService } from './comentarios.service.js';
type Peticion = Request & { user: UsuarioAutenticado };

@Controller('api/comentarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class ComentariosController {
    constructor(private readonly service: ComentariosService) {}
    @Get()
    @Roles('ADMIN', 'SUPERVISOR')
    findAll(@Req() req: Peticion) { return this.service.findAll(req.user); }
    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId', ParseIntPipe) id: number, @Req() req: Peticion) { return this.service.findByTicket(id, req.user); }
    @Post()
    create(@Body() body: unknown, @Req() req: Peticion) { return this.service.create(body, req.user); }
}
