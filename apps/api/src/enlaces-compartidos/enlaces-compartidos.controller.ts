import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { identificador } from '../tickets/tickets.dto.js';
import { enlaceId } from './enlaces-compartidos.rules.js';
import { EnlacesCompartidosService } from './enlaces-compartidos.service.js';
import type { UsuarioEnlace } from './enlaces-compartidos.service.js';

@Controller('api/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class EnlacesCompartidosController {
    constructor(private readonly servicio: EnlacesCompartidosService) {}
    @Post(':ticketId/compartir')
    crear(@Param('ticketId') id: string, @Body() body: unknown, @Req() req: Request & { user: UsuarioEnlace }) {
        return this.servicio.crear(identificador(Number(id), 'ticketId'), body, req.user);
    }
    @Get(':ticketId/enlaces-compartidos')
    listar(@Param('ticketId') id: string, @Req() req: Request & { user: UsuarioEnlace }) {
        return this.servicio.listar(identificador(Number(id), 'ticketId'), req.user);
    }
    @Delete('enlaces-compartidos/:enlaceId')
    revocar(@Param('enlaceId') id: string, @Req() req: Request & { user: UsuarioEnlace }) {
        return this.servicio.revocar(enlaceId(id), req.user);
    }
}
@Controller('api/public/compartidos')
export class TicketCompartidoController {
    constructor(private readonly servicio: EnlacesCompartidosService) {}
    @Get(':token')
    obtener(@Param('token') token: string) { return this.servicio.publico(token); }
}
