import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ProyectosModule } from '../src/proyectos/proyectos.module.js';
import { db } from '../src/prisma/db.js';
import { proyectosFixture } from './proyectos-fixture.js';

describe('Acceso por proyecto (HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let fixture: ReturnType<typeof proyectosFixture>;

  beforeEach(async () => {
    fixture = proyectosFixture();
    Object.assign(db.orm.public, {
      Proyectos: fixture.Proyectos,
      UsuarioProyectos: fixture.UsuarioProyectos,
    });
    const module = await Test.createTestingModule({ imports: [ProyectosModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterEach(async () => { await app?.close(); });

  function get(path: string, rol: string, usuarioId = 10) {
    return request(app.getHttpServer()).get(path)
      .set('Authorization', `Bearer ${jwt.sign({ usuarioId, rol })}`);
  }

  it.each(['/api/proyectos', '/api/proyectos/1'])('sin token: %s -> 401', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });

  it('ADMIN obtiene todos los proyectos con los mismos campos', async () => {
    await get('/api/proyectos', 'ADMIN').expect(200).expect(fixture.proyectos);
  });

  it.each([1, 2, 3, 4, 5])('ADMIN accede al proyecto %s sin restricciones', async (id) => {
    await get(`/api/proyectos/${id}`, 'ADMIN').expect(200).expect(fixture.proyectos[id - 1]);
  });

  describe.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s', (rol) => {
    it('accede a su proyecto -> 200', async () => {
      await get('/api/proyectos/1', rol).expect(200).expect(fixture.proyectos[0]);
    });

    it('el listado contiene solo proyectos asignados y disponibles', async () => {
      await get('/api/proyectos', rol).expect(200).expect([fixture.proyectos[0]]);
    });

    it.each([2, 3, 4, 5])('rechaza proyecto %s ajeno o inactivo -> 403', async (id) => {
      await get(`/api/proyectos/${id}`, rol).expect(403);
    });

    it('sin asignaciones devuelve lista vacia y rechaza el detalle', async () => {
      await get('/api/proyectos', rol, 99).expect(200).expect([]);
      await get('/api/proyectos/1', rol, 99).expect(403);
    });

    it('no permite suplantar al usuario mediante query parameters', async () => {
      await get('/api/proyectos/2?usuarioId=20&rol=ADMIN', rol).expect(403);
    });
  });

  it('ADMIN recibe 400 legacy si el proyecto no existe', async () => {
    await get('/api/proyectos/999', 'ADMIN').expect(400);
  });

  it('rechaza id de proyecto invalido', async () => {
    await get('/api/proyectos/abc', 'ADMIN').expect(400);
  });

  it('rechaza rol desconocido', async () => {
    await get('/api/proyectos/1', 'OTRO').expect(403);
  });

  it('rechaza token sin usuarioId verificable', async () => {
    await request(app.getHttpServer()).get('/api/proyectos/1')
      .set('Authorization', `Bearer ${jwt.sign({ rol: 'SUPERVISOR' })}`).expect(401);
  });
});
