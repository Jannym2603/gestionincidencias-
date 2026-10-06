import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { RolesGuard } from '../security/roles.guard.js';
import { Roles } from '../security/roles.decorator.js';
import { ReportesService } from './reportes.service.js';
import type { UsuarioReportes } from './reportes.service.js';
import { filtrosReporte } from './reportes.rules.js';
type Peticion = Request & { user: UsuarioReportes };

@Controller('api/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE')
export class ReportesController {
    constructor(private readonly reportes: ReportesService) {}
    @Get('dashboard-resumen')
    dashboard(@Req() req: Peticion) { return this.reportes.resumen(req.user, undefined, true); }
    @Get('resumen')
    resumen(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.resumen(req.user, filtrosReporte(query)); }
    @Get('tickets-por-estado')
    estados(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.porEstado(req.user, filtrosReporte(query)); }
    @Get('tickets-por-prioridad')
    prioridades(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.porPrioridad(req.user, filtrosReporte(query)); }
    @Get('tickets-por-tipo')
    tipos(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.porTipo(req.user, filtrosReporte(query)); }
    @Get('operacion-resumen')
    operacion(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.operacion(req.user, filtrosReporte(query)); }
    @Get('recursos-resumen')
    recursos(@Req() req: Peticion, @Query() query: Record<string, unknown>) { return this.reportes.recursos(req.user, filtrosReporte(query)); }
}
