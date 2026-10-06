import { vi } from 'vitest';
vi.unmock('./identidad.service.js');
import { IdentidadService } from './identidad.service.js';
import { db } from '../prisma/db.js';
import { coleccion } from '../../test/proyectos-fixture.js';
describe('Identidad persistida y normalización JWT', () => {
    const claims = { sub: 'admin@example.test', usuarioId: 30, rol: 'ADMIN' };
    let cuenta: { id: number; correo: string; estado: boolean }; let roles: Record<string, unknown>[];
    beforeEach(() => {
        cuenta = { id: 30, correo: claims.sub, estado: true }; roles = [{ usuarioId: 30, rol: { nombre: 'ADMIN' } }];
        Object.assign(db.orm.public, { Usuarios: coleccion([cuenta]), UsuarioRoles: coleccion(roles) });
    });
    it('resuelve cuenta y rol guardados, mantiene claims', async () => { expect(await new IdentidadService().resolver(claims)).toEqual(claims); });
    it('normaliza ROLE_ y espacios/mayúsculas como Spring', async () => { expect((await new IdentidadService().resolver({ ...claims, rol: ' role_admin ' })).rol).toBe('ADMIN'); });
    it('deriva identificador desde sub si no viene en JWT', async () => { expect((await new IdentidadService().resolver({ sub: claims.sub, rol: 'ADMIN' })).usuarioId).toBe(30); });
    it.each([{ rol: 'ADMIN' }, { sub: '', rol: 'ADMIN' }, { sub: claims.sub }, { sub: claims.sub, rol: null }])('rechaza token incompleto %j', async (payload) => { await expect(new IdentidadService().resolver(payload)).rejects.toThrow(); });
    it('no permite reutilizar privilegios tras cambio de rol', async () => { roles[0]!.rol = { nombre: 'CLIENTE' }; await expect(new IdentidadService().resolver(claims)).rejects.toThrow(); });
    it('identificador no coincide con cuenta', async () => { await expect(new IdentidadService().resolver({ ...claims, usuarioId: 10 })).rejects.toThrow(); });
    it('cuenta inactiva invalida sesión', async () => { cuenta.estado = false; await expect(new IdentidadService().resolver(claims)).rejects.toThrow(); });
    it('cuenta inexistente', async () => { await expect(new IdentidadService().resolver({ ...claims, sub: 'no-existe@example.test' })).rejects.toThrow(); });
    it('cuenta sin rol', async () => { Object.assign(db.orm.public, { UsuarioRoles: coleccion([]) }); await expect(new IdentidadService().resolver(claims)).rejects.toThrow(); });
});
