import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { HistorialTicketsService } from './historial-tickets.service.js';
type Peticion = Request & { user: UsuarioAutenticado };
@Controller('api/historial-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class HistorialTicketsController {
    constructor(private readonly service: HistorialTicketsService) {}
    @Get()
    @Roles('ADMIN', 'SUPERVISOR')
    findAll(@Req() req: Peticion) { return this.service.findAll(req.user); }
    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId', ParseIntPipe) id: number, @Req() req: Peticion) { return this.service.findByTicket(id, req.user); }
}
