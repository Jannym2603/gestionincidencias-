import { BadRequestException, Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { proyectoDTO } from '../administracion/administracion.service.js';

@Injectable()
export class ProyectosService {
  constructor(private readonly accesoProyecto: AccesoProyectoService) {}

  async findAll(usuario: UsuarioAutenticado) {
    const ids = await this.accesoProyecto.obtenerIdsPermitidos(usuario);
    if (ids === null) {
      return (await db.orm.public.Proyectos.include('compania').all()).map(proyectoDTO);
    }
    if (ids.length === 0) {
      return [];
    }
    return (await db.orm.public.Proyectos.where((p) => p.id.in(ids)).include('compania').all()).map(proyectoDTO);
  }

  async findOne(id: number, usuario: UsuarioAutenticado) {
    await this.accesoProyecto.validarAccesoProyecto(usuario, id);
    const proyecto = await db.orm.public.Proyectos.where((p) => p.id.eq(id)).include('compania').first();
    if (!proyecto) {
      throw new BadRequestException('Proyecto no encontrado.');
    }
    return proyectoDTO(proyecto);
  }
}
