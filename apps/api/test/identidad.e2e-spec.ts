import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { IdentidadService } from '../src/security/identidad.service.js';
import { db } from '../src/prisma/db.js';
import { coleccion } from './proyectos-fixture.js';

describe('Permisos revocados y guard real HTTP', () => {
    let app: INestApplication; let jwt: JwtService;
    let cuenta: { id: number; correo: string; estado: boolean }; let roles: Record<string, unknown>[];
    beforeEach(async () => {
        cuenta = { id: 30, correo: 'admin@example.test', estado: true }; roles = [{ usuarioId: 30, rol: { nombre: 'CLIENTE' } }];
        Object.assign(db.orm.public, { Usuarios: coleccion([cuenta]), UsuarioRoles: coleccion(roles), TiposIncidencia: { all: async () => [] } });
        const real = await vi.importActual<typeof import('../src/security/identidad.service.js')>('../src/security/identidad.service.js');
        const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(IdentidadService).useValue(new real.IdentidadService()).compile();
        app = mod.createNestApplication({ logger: false }); await app.init(); jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    const token = (datos: object = {}) => jwt.sign({ sub: cuenta.correo, usuarioId: 30, rol: 'ADMIN', ...datos });
    it.each(['tickets', 'comentarios', 'historial-tickets', 'adjuntos/ticket/1', 'solicitudes-recursos', 'reportes/resumen', 'configuracion-sistema', 'proyectos', 'usuarios', 'companias', 'roles', 'tipos-incidencia', 'usuario-proyectos', 'usuario-roles', 'tickets/1/enlaces-compartidos'])('rol retirado GET /api/%s ->401', async (ruta) => {
        const res = await request(app.getHttpServer()).get(`/api/${ruta}`).set('Authorization', `Bearer ${token()}`).expect(401);
        expect(res.body).toMatchObject({ status: 401, error: 'Unauthorized' });
    });
    it('guard acepta normalización de Spring y rol persistido coincidente', async () => {
        roles[0]!.rol = { nombre: 'ADMIN' }; await request(app.getHttpServer()).get('/api/tipos-incidencia').set('Authorization', `Bearer ${token({ rol: 'role_admin' })}`).expect(200);
    });
    it('token sin sub no accede ni a configuración', async () => { await request(app.getHttpServer()).get('/api/configuracion-sistema').set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN', usuarioId: 30 })}`).expect(401); });
    it('cuenta inactiva no accede con JWT vigente', async () => { cuenta.estado = false; roles[0]!.rol = { nombre: 'ADMIN' }; await request(app.getHttpServer()).get('/api/tipos-incidencia').set('Authorization', `Bearer ${token()}`).expect(401); });
});
