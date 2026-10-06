import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { db } from '../prisma/db.js';

export interface UsuarioAutenticado {
  usuarioId: number;
  rol: string;
}

@Injectable()
export class AccesoProyectoService {
  // null representa acceso global; [] representa ausencia de proyectos accesibles.
  async obtenerIdsPermitidos(usuario: UsuarioAutenticado): Promise<number[] | null> {
    if (!usuario || !Number.isSafeInteger(usuario.usuarioId) || usuario.usuarioId <= 0) {
      throw new UnauthorizedException('No se pudo identificar al usuario.');
    }
    if (usuario.rol === 'ADMIN') {
      return null;
    }
    if (!['SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(usuario.rol)) {
      throw new ForbiddenException('El rol no tiene acceso a proyectos.');
    }

    const asignaciones = await db.orm.public.UsuarioProyectos
      .where((up) => up.usuarioId.eq(usuario.usuarioId))
      .where((up) => up.estado.eq(true))
      .include('proyecto', (proyecto) => proyecto.include('compania'))
      .all();

    return asignaciones
      .filter(({ proyecto }) => proyecto?.estado === true && proyecto.compania?.estado === true)
      .map(({ proyectoId }) => proyectoId);
  }

  async validarAccesoProyecto(usuario: UsuarioAutenticado, proyectoId: number): Promise<void> {
    const ids = await this.obtenerIdsPermitidos(usuario);
    if (ids !== null && !ids.includes(proyectoId)) {
      throw new ForbiddenException('No tienes acceso al proyecto seleccionado.');
    }
  }
}
