import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccesoProyectoService } from './acceso-proyecto.service.js';
import { db } from '../prisma/db.js';
import { proyectosFixture } from '../../test/proyectos-fixture.js';

describe('AccesoProyectoService', () => {
  const service = new AccesoProyectoService();

  beforeEach(() => {
    Object.assign(db.orm.public, { UsuarioProyectos: proyectosFixture().UsuarioProyectos });
  });

  it('ADMIN omite consultas a asignaciones', async () => {
    Object.assign(db.orm.public, { UsuarioProyectos: undefined });
    await expect(service.obtenerIdsPermitidos({ usuarioId: 10, rol: 'ADMIN' })).resolves.toBeNull();
    await expect(service.validarAccesoProyecto({ usuarioId: 10, rol: 'ADMIN' }, 5)).resolves.toBeUndefined();
  });

  it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('filtra asignacion, proyecto y compania para %s', async (rol) => {
    await expect(service.obtenerIdsPermitidos({ usuarioId: 10, rol })).resolves.toEqual([1]);
    await expect(service.validarAccesoProyecto({ usuarioId: 10, rol }, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([0, -1, NaN, 1.5])('rechaza identificador de usuario invalido %s', async (usuarioId) => {
    await expect(service.obtenerIdsPermitidos({ usuarioId, rol: 'ADMIN' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('falla cerrado ante un rol desconocido', async () => {
    await expect(service.obtenerIdsPermitidos({ usuarioId: 10, rol: 'OTRO' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
