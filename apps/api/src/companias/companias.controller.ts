import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdministracionService } from '../administracion/administracion.service.js';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { identificador } from '../tickets/tickets.dto.js';
@Controller('api/companias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR')
export class CompaniasController {
    constructor(private readonly servicio: AdministracionService) {}
    @Get() listar() { return this.servicio.companias(); }
    @Get('activas') activas() { return this.servicio.companias(true); }
    @Get(':id') obtener(@Param('id') id: string) { return this.servicio.compania(identificador(Number(id), 'id')); }
    @Post() @Roles('ADMIN') crear(@Body() body: unknown) { return this.servicio.guardarCompania(null, body); }
    @Put(':id') @Roles('ADMIN') actualizar(@Param('id') id: string, @Body() body: unknown) { return this.servicio.guardarCompania(identificador(Number(id), 'id'), body); }
    @Put(':id/estado') @Roles('ADMIN') estado(@Param('id') id: string, @Body() body: unknown) { return this.servicio.estadoCompania(identificador(Number(id), 'id'), body); }
}
