import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../src/auth/auth.module.js';
import { SecurityModule } from '../src/security/security.module.js';
import { UsuariosModule } from '../src/usuarios/usuarios.module.js';
import { db } from '../src/prisma/db.js';
import * as bcrypt from 'bcrypt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const allUsuarios = vi.fn();
  const listados = [
    { path: 'companias', tabla: 'Companias', all: vi.fn(), datos: [{ id: 1, nombre: 'Compania de prueba' }] },
  ];
  const usuario = {
    id: 1,
    correo: 'admin@example.test',
    nombre: 'Admin',
    apellido: 'Prueba',
    estado: true,
    password: '',
  };

  beforeAll(async () => {
    usuario.password = await bcrypt.hash('password-solo-pruebas', 4);
  });

  beforeEach(async () => {
    allUsuarios.mockReset().mockResolvedValue([usuario]);
    Object.assign(db.orm.public, {
      Usuarios: {
        all: allUsuarios,
        where: () => ({ first: async () => usuario }),
      },
      UsuarioRoles: {
        include: () => ({ include: () => ({ all: async () => [{ id: 1, usuarioId: 1, rolId: 1, usuario, rol: { id: 1, nombre: 'ADMIN' } }] }) }),
        where: () => ({
          include: () => ({ first: async () => ({ rol: { nombre: 'ADMIN' } }) }),
        }),
      },
      ...Object.fromEntries(['Roles', 'TiposIncidencia']
        .map((name) => [name, { all: async () => [] }])),
      ...Object.fromEntries(listados.map(({ tabla, all, datos }) => {
        all.mockReset().mockResolvedValue(datos);
        return [tabla, { all }];
      })),
    });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('comparte JwtService entre AuthModule y SecurityModule', () => {
    expect(app.select(AuthModule).get(JwtService)).toBe(jwt);
    expect(app.select(SecurityModule).get(JwtService)).toBe(jwt);
  });

  it('UsuariosModule se inicializa sin importar AuthModule', async () => {
    const isolated = await Test.createTestingModule({ imports: [UsuariosModule] }).compile();
    expect(isolated.get(JwtService)).toBeDefined();
    await isolated.close();
  });

  it('/api/usuarios sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/api/usuarios').expect(401);
    expect(allUsuarios).not.toHaveBeenCalled();
  });

  it('/api/usuarios con token ADMIN devuelve 200 sin exponer password', async () => {
    const token = await jwt.signAsync({ sub: usuario.correo, usuarioId: 1, rol: 'ADMIN' });
    const response = await request(app.getHttpServer()).get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body).toEqual([{
      id: 1, nombre: 'Admin', apellido: 'Prueba', correo: usuario.correo, estado: true, rol: 'ADMIN',
    }]);
    expect(allUsuarios).toHaveBeenCalledOnce();
  });

  it.each(['AGENTE', 'USUARIO', 'admin', undefined])(
    '/api/usuarios con rol %s devuelve 403', async (rol) => {
      const token = await jwt.signAsync({ sub: usuario.correo, rol });
      await request(app.getHttpServer()).get('/api/usuarios')
        .set('Authorization', `Bearer ${token}`).expect(403);
      expect(allUsuarios).not.toHaveBeenCalled();
    },
  );

  it.each(['Basic abc', 'Bearer', 'Bearer invalid', 'Bearer abc extra'])(
    'rechaza cabecera invalida %s con 401', async (header) => {
      await request(app.getHttpServer()).get('/api/usuarios')
        .set('Authorization', header).expect(401);
      expect(allUsuarios).not.toHaveBeenCalled();
    },
  );

  it('rechaza tokens expirados y con firma incorrecta con 401', async () => {
    const expired = await jwt.signAsync({ rol: 'ADMIN' }, { expiresIn: -1 });
    const invalid = await jwt.signAsync({ rol: 'ADMIN' }, { secret: 'otra-clave-solo-pruebas' });
    for (const token of [expired, invalid]) {
      await request(app.getHttpServer()).get('/api/usuarios')
        .set('Authorization', `Bearer ${token}`).expect(401);
    }
    expect(allUsuarios).not.toHaveBeenCalled();
  });

  it('acepta el token ADMIN emitido por POST /api/auth/login', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ correo: usuario.correo, password: 'password-solo-pruebas' }).expect(200);
    expect(login.body.rol).toBe('ADMIN');
    const payload = await jwt.verifyAsync(login.body.token);
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
    await request(app.getHttpServer()).get('/api/usuarios')
      .set('Authorization', `Bearer ${login.body.token}`).expect(200);
  });

  for (const { path, all, datos } of listados) {
    describe(`GET /api/${path}`, () => {
      it('sin token devuelve 401', async () => {
        await request(app.getHttpServer()).get(`/api/${path}`).expect(401);
        expect(all).not.toHaveBeenCalled();
      });

      it.each(['ADMIN', 'SUPERVISOR'])('%s recibe 200 y la respuesta original', async (rol) => {
        const token = await jwt.signAsync({ sub: usuario.correo, rol });
        await request(app.getHttpServer()).get(`/api/${path}`)
          .set('Authorization', `Bearer ${token}`).expect(200).expect(datos);
        expect(all).toHaveBeenCalledOnce();
      });

      it.each(['AGENTE', 'CLIENTE'])('%s recibe 403', async (rol) => {
        const token = await jwt.signAsync({ sub: usuario.correo, rol });
        await request(app.getHttpServer()).get(`/api/${path}`)
          .set('Authorization', `Bearer ${token}`).expect(403);
        expect(all).not.toHaveBeenCalled();
      });
    });
  }

  it.each(['roles', 'tipos-incidencia'])(
    'conserva GET /api/%s', async (path) => {
      await request(app.getHttpServer()).get(`/api/${path}`).set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN', usuarioId: 1, sub: usuario.correo })}`).expect(200).expect([]);
    },
  );

  afterEach(async () => {
    await app?.close();
  });
});
