import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { json } from 'express';
import { AppModule } from '../src/app.module.js';
import { AdministracionRepository } from '../src/administracion/administracion.repository.js';
import { AccesoProyectoService } from '../src/security/acceso-proyecto.service.js';
import { db } from '../src/prisma/db.js';
import { coleccion } from './proyectos-fixture.js';
import { administracionFixture } from './administracion-fixture.js';

describe('Paridad administrativa y rutas legacy HTTP', () => {
    let app: INestApplication; let jwt: JwtService; let f: ReturnType<typeof administracionFixture>;
    const usuario = { nombre: 'Nombre', apellido: 'Apellido', correo: 'nuevo@example.test', rol: 'CLIENTE', password: 'password-fixture' };
    beforeEach(async () => {
        f = administracionFixture();
        Object.assign(db.orm.public, { Proyectos: coleccion(f.proyectos as unknown as Record<string, unknown>[]), Roles: { all: async () => f.roles }, TiposIncidencia: { all: async () => [{ id: 1, nombre: 'Incidencia', descripcion: null, estado: true }] } });
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(AdministracionRepository).useValue(f.repo)
            .overrideProvider(AccesoProyectoService).useValue({ obtenerIdsPermitidos: async (a: { rol: string }) => a.rol === 'ADMIN' ? null : [1],
                validarAccesoProyecto: async (a: { rol: string }, id: number) => { if (a.rol !== 'ADMIN' && id !== 1) throw new ForbiddenException(); } }).compile();
        app = mod.createNestApplication({ logger: false, bodyParser: false }); app.use(json({ strict: false, limit: '12mb' })); await app.init(); jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    const id = (rol: string) => ({ ADMIN: 30, SUPERVISOR: 31, AGENTE: 20, CLIENTE: 10 })[rol] ?? 30;
    function http(method: 'get' | 'post' | 'put', ruta: string, rol = 'ADMIN') {
        return request(app.getHttpServer())[method](`/api/${ruta}`).set('Authorization', `Bearer ${jwt.sign({ sub: `${rol.toLowerCase()}@example.test`, usuarioId: id(rol), rol })}`);
    }
    const lecturas = ['usuarios', 'usuarios/me', 'roles', 'usuario-roles', 'tipos-incidencia', 'companias', 'companias/activas', 'companias/1', 'proyectos', 'proyectos/activos', 'proyectos/1', 'proyectos/compania/1', 'proyectos/compania/1/activos', 'usuario-proyectos', 'usuario-proyectos/mis-proyectos', 'usuario-proyectos/usuario/10', 'usuario-proyectos/usuario/10/todas', 'usuario-proyectos/proyecto/1'];
    it.each(lecturas)('GET %s sin token 401', async (ruta) => { await request(app.getHttpServer()).get(`/api/${ruta}`).expect(401); });
    it.each(lecturas)('GET %s ADMIN 200 y sin secretos/rutas', async (ruta) => {
        const res = await http('get', ruta).expect(200); expect(JSON.stringify(res.body)).not.toMatch(/password|hash|rutaArchivo/);
    });
    it.each(['usuarios', 'roles', 'usuario-roles', 'companias', 'usuario-proyectos', 'usuario-proyectos/usuario/10/todas', 'usuario-proyectos/proyecto/1'])('CLIENTE no consulta %s ->403', async (ruta) => { await http('get', ruta, 'CLIENTE').expect(403); });
    it.each(['ADMIN', 'SUPERVISOR'])('%s recibe rol y DTO completo en usuarios', async (rol) => {
        const res = await http('get', 'usuarios', rol).expect(200); expect(res.body[0]).toMatchObject({ rol: 'ADMIN', telefono: null });
        expect(Object.keys(res.body[0]).sort()).toEqual(['id', 'nombre', 'apellido', 'correo', 'telefono', 'rol', 'estado', 'fechaCreacion'].sort());
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('perfil propio %s', async (rol) => { const res = await http('get', 'usuarios/me', rol).expect(200); expect(res.body.id).toBe(id(rol)); expect(res.body.rol).toBe(rol); });
    it('crea usuario BCrypt coste10, no secreto y nullable', async () => {
        const res = await http('post', 'usuarios').send(usuario).expect(201);
        expect(res.body).toMatchObject({ rol: 'CLIENTE', estado: true, telefono: null });
        const guardado = f.usuarios.find((u) => u.id === res.body.id)!;
        expect(await bcrypt.compare(usuario.password, guardado.password)).toBe(true); expect(bcrypt.getRounds(guardado.password)).toBe(10);
        expect(res.body).not.toHaveProperty('password');
    });
    it('SUPERVISOR puede crear y editar CLIENTE/AGENTE, no ADMIN/SUPERVISOR', async () => {
        await http('post', 'usuarios', 'SUPERVISOR').send(usuario).expect(201);
        await http('put', 'usuarios/10', 'SUPERVISOR').send({ ...usuario, correo: 'editado@example.test', rol: 'AGENTE', password: '', telefono: ' 123 ' }).expect(200);
        for (const rol of ['ADMIN', 'SUPERVISOR']) await http('post', 'usuarios', 'SUPERVISOR').send({ ...usuario, correo: `nuevo${rol}@example.test`, rol }).expect(400);
        await http('put', 'usuarios/30', 'SUPERVISOR').send(usuario).expect(400);
        await http('put', 'usuarios/30/estado', 'SUPERVISOR').send({ estado: false }).expect(400);
    });
    it('actualización sin password conserva hash y teléfono vacío pasa a null', async () => {
        const previo = f.usuarios.find((u) => u.id === 10)!.password;
        await http('put', 'usuarios/10').send({ ...usuario, password: null, telefono: ' ' }).expect(200);
        expect(f.usuarios.find((u) => u.id === 10)!.password).toBe(previo);
    });
    it('duplicados correo y password corto no dejan registros', async () => {
        await http('post', 'usuarios').send({ ...usuario, correo: 'ADMIN@example.test' }).expect(400);
        await http('post', 'usuarios').send({ ...usuario, password: 'abc' }).expect(400); expect(f.usuarios).toHaveLength(4);
    });
    it('fallo guardando rol revierte usuario', async () => { f.repo.crearRol.mockRejectedValue(new Error('dato interno secreto')); const res = await http('post', 'usuarios').send(usuario).expect(500); expect(f.usuarios).toHaveLength(4); expect(JSON.stringify(res.body)).not.toContain('secreto'); });
    it('estado usuario requiere objeto booleano y no permite auto-desactivar', async () => {
        await http('put', 'usuarios/10/estado').send({ estado: false }).expect(200);
        await http('put', 'usuarios/30/estado').send({ estado: false }).expect(400);
        await http('put', 'usuarios/10/estado').send({ estado: 'true' }).expect(400);
    });
    it.each(['usuarios/999', 'usuarios/999/estado', 'companias/999', 'companias/999/estado', 'proyectos/999', 'proyectos/999/estado'])('PUT %s inexistente ->400 legacy', async (ruta) => {
        const req = http('put', ruta); await (ruta.endsWith('estado') && !ruta.startsWith('usuarios') ? req.set('Content-Type', 'application/json').send('false') : req.send({ ...usuario, companiaId: 1, estado: false })).expect(400);
    });
    it.each(['companias/999', 'proyectos/999', 'proyectos/compania/999', 'proyectos/compania/999/activos', 'usuario-proyectos/usuario/999', 'usuario-proyectos/proyecto/999'])('GET %s inexistente ->400 legacy', async (ruta) => { await http('get', ruta).expect(400); });
    it.each(['companias', 'proyectos', 'usuario-proyectos', 'usuarios'])('POST %s sin token ->401', async (ruta) => { await request(app.getHttpServer()).post(`/api/${ruta}`).send({}).expect(401); });
    it.each(['companias', 'proyectos'])('SUPERVISOR no modifica %s', async (ruta) => {
        await http('post', ruta, 'SUPERVISOR').send({ nombre: 'Nuevo', companiaId: 1 }).expect(403);
        await http('put', `${ruta}/1`, 'SUPERVISOR').send({ nombre: 'Nuevo', companiaId: 1 }).expect(403);
    });
    it('compañía crear/update/estado booleano y nombre duplicado ignoreCase', async () => {
        const res = await http('post', 'companias').send({ nombre: ' Nueva ', descripcion: null }).expect(201);
        expect(res.body).toMatchObject({ nombre: 'Nueva', estado: true, descripcion: null });
        await http('post', 'companias').send({ nombre: 'nueva' }).expect(400);
        await http('put', `companias/${res.body.id}`).send({ nombre: 'Cambiada', descripcion: ' desc ', estado: null }).expect(200);
        const estado = await http('put', `companias/${res.body.id}/estado`).set('Content-Type', 'application/json').send('false').expect(200); expect(estado.body.estado).toBe(false);
        await http('put', 'companias/1/estado').send({ estado: false }).expect(400);
    });
    it('proyecto crear/update/estado y companiaNombre', async () => {
        const res = await http('post', 'proyectos').send({ nombre: 'Nuevo', companiaId: 1 }).expect(201);
        expect(res.body).toMatchObject({ companiaNombre: 'Compañía 1', companiaId: 1, estado: true, descripcion: null });
        await http('put', `proyectos/${res.body.id}`).send({ nombre: 'Renombrado', companiaId: 1, estado: null }).expect(200);
        await http('put', `proyectos/${res.body.id}/estado`).set('Content-Type', 'application/json').send('false').expect(200);
    });
    it('proyecto duplicado por compañía, compañías inactivas y activación inválida', async () => {
        await http('post', 'proyectos').send({ nombre: 'proyecto 1', companiaId: 1 }).expect(400);
        await http('post', 'proyectos').send({ nombre: 'Nuevo', companiaId: 2 }).expect(400);
        await http('put', 'proyectos/4/estado').set('Content-Type', 'application/json').send('true').expect(400);
        await http('post', 'proyectos').send({ nombre: 'Nuevo', companiaId: 999 }).expect(400);
    });
    it('lecturas de proyectos y compañías activos mantienen contrato y filtro', async () => {
        expect((await http('get', 'companias/activas').expect(200)).body).toHaveLength(1);
        const todos = await http('get', 'proyectos').expect(200); expect(todos.body[0].companiaNombre).toBe('Compañía 1');
        expect((await http('get', 'proyectos/compania/1/activos').expect(200)).body.map((p: { id: number }) => p.id)).toEqual([1, 2]);
    });
    it('mis-proyectos filtra asignación/proyecto/compañía activos y entrega DTO plano', async () => {
        const res = await http('get', 'usuario-proyectos/mis-proyectos', 'CLIENTE').expect(200);
        expect(res.body).toHaveLength(1); expect(res.body[0]).toMatchObject({ usuarioId: 10, proyectoId: 1, companiaNombre: 'Compañía 1', usuarioCorreo: 'cliente@example.test' });
        expect(res.body[0]).not.toHaveProperty('usuario'); expect(res.body[0]).not.toHaveProperty('proyecto');
    });
    it('CLIENTE solo consulta propios y AGENTE usa mis-proyectos', async () => {
        await http('get', 'usuario-proyectos/usuario/10', 'CLIENTE').expect(200);
        await http('get', 'usuario-proyectos/usuario/20', 'CLIENTE').expect(400);
        await http('get', 'usuario-proyectos/usuario/20', 'AGENTE').expect(403);
        await http('get', 'usuario-proyectos/mis-proyectos', 'AGENTE').expect(200);
    });
    it('SUPERVISOR listas/todas/proyecto quedan en su alcance', async () => {
        for (const ruta of ['usuario-proyectos', 'usuario-proyectos/usuario/10/todas', 'usuario-proyectos/usuario/10']) {
            const res = await http('get', ruta, 'SUPERVISOR').expect(200); expect(res.body.every((a: { proyectoId: number }) => a.proyectoId === 1)).toBe(true);
        }
        await http('get', 'usuario-proyectos/proyecto/2', 'SUPERVISOR').expect(403);
    });
    it('lista por proyecto excluye asignaciones inactivas; todas incluye inactivas ordenadas', async () => {
        expect((await http('get', 'usuario-proyectos/proyecto/2').expect(200)).body).toEqual([]);
        expect((await http('get', 'usuario-proyectos/usuario/10/todas').expect(200)).body.map((a: { id: number }) => a.id)).toEqual([5, 4, 3]);
    });
    it('asignar crea201, desactivar200 y reactivar con POST201 sin duplicar', async () => {
        const creado = await http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 }).expect(201);
        await http('put', `usuario-proyectos/${creado.body.id}/desactivar`).expect(200);
        await http('put', `usuario-proyectos/${creado.body.id}/desactivar`).expect(400);
        const previo = f.accesos.length;
        const reactivado = await http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 }).expect(201);
        expect(reactivado.body.id).toBe(creado.body.id); expect(f.accesos).toHaveLength(previo);
        await http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 }).expect(400);
    });
    it('PUT activar y validación de usuario/proyecto/compañía', async () => {
        await http('put', 'usuario-proyectos/4/activar').expect(200); await http('put', 'usuario-proyectos/4/activar').expect(400);
        await http('put', 'usuario-proyectos/5/activar').expect(400);
        f.usuarios.find((u) => u.id === 20)!.estado = false;
        await http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 }).expect(400);
        await http('post', 'usuario-proyectos').send({ usuarioId: 10, proyectoId: 4 }).expect(400);
        await http('put', 'usuario-proyectos/999/activar').expect(400);
    });
    it('SUPERVISOR no asigna/desactiva/reactiva ajenos', async () => {
        await http('post', 'usuario-proyectos', 'SUPERVISOR').send({ usuarioId: 20, proyectoId: 2 }).expect(403);
        await http('put', 'usuario-proyectos/4/activar', 'SUPERVISOR').expect(403);
        await http('put', 'usuario-proyectos/4/desactivar', 'SUPERVISOR').expect(403);
    });
    it('dos altas concurrentes no duplican asignaciones', async () => {
        const resultados = await Promise.all([http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 }), http('post', 'usuario-proyectos').send({ usuarioId: 20, proyectoId: 2 })]);
        expect(resultados.map((r) => r.status).sort()).toEqual([201, 400]); expect(f.accesos.filter((a) => a.usuarioId === 20 && a.proyectoId === 2)).toHaveLength(1);
    });
    it('JSON malformado devuelve400 sin filtrar el payload', async () => { const res = await http('post', 'companias').set('Content-Type', 'application/json').send('{"secreto":').expect(400); expect(res.body).toMatchObject({ status: 400, message: 'JSON inválido.' }); expect(JSON.stringify(res.body)).not.toContain('secreto'); });
    it('datos vacíos no fallan', async () => { f.usuarios.length = 0; f.relaciones.length = 0; f.companias.length = 0; f.proyectos.length = 0; f.accesos.length = 0; for (const ruta of ['usuarios', 'usuario-roles', 'companias', 'proyectos', 'usuario-proyectos']) expect((await http('get', ruta).expect(200)).body).toEqual([]); });
    it('errores conservan contrato Spring sin secretos', async () => { const res = await http('get', 'companias/999').expect(400); expect(res.body).toMatchObject({ status: 400, error: 'Bad Request', message: 'Compañía no encontrada.' }); expect(res.body.timestamp).toBeTruthy(); expect(res.body).not.toHaveProperty('statusCode'); });
});
