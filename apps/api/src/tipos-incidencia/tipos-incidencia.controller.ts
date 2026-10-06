import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../security/jwt-auth.guard.js';
import { TiposIncidenciaService } from './tipos-incidencia.service.js';

@Controller('api/tipos-incidencia')
@UseGuards(JwtAuthGuard)
export class TiposIncidenciaController {
  constructor(
    private readonly tiposIncidenciaService: TiposIncidenciaService,
  ) {}

  @Get()
  findAll() {
    return this.tiposIncidenciaService.findAll();
  }
}
