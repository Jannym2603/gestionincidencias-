import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { TicketsService } from './tickets.service.js';

type Peticion = Request & { user: UsuarioAutenticado };

@Controller('api/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class TicketsController {
    constructor(private readonly tickets: TicketsService) {}

    @Get()
    findAll(@Req() req: Peticion) { return this.tickets.findAll(req.user); }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Peticion) { return this.tickets.findOne(id, req.user); }

    @Post()
    create(@Body() body: unknown, @Req() req: Peticion) { return this.tickets.create(body, req.user); }

    @Put(':id/asignar')
    @Roles('ADMIN', 'SUPERVISOR')
    asignar(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() req: Peticion) {
        return this.tickets.asignar(id, body, req.user);
    }

    @Put(':id/estado')
    @Roles('ADMIN', 'SUPERVISOR', 'AGENTE')
    estado(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() req: Peticion) {
        return this.tickets.estado(id, body, req.user);
    }

    @Put(':id/prioridad')
    @Roles('ADMIN', 'SUPERVISOR', 'AGENTE')
    prioridad(@Param('id', ParseIntPipe) id: number, @Body() body: unknown, @Req() req: Peticion) {
        return this.tickets.prioridad(id, body, req.user);
    }
}
