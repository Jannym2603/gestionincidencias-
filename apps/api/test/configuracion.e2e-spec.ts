import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Temporal } from 'temporal-polyfill';
import { AppModule } from '../src/app.module.js';
import { ConfiguracionRepository } from '../src/configuracion/configuracion.repository.js';
import { ConfiguracionSistemaService, CONFIGURACION_INICIAL } from '../src/configuracion/configuracion-sistema.service.js';
import { FLAGS_CONFIGURACION } from '../src/configuracion/configuracion.rules.js';
import { configuracionFixture } from './configuracion-fixture.js';

describe('Configuracion del sistema y auditoria HTTP', () => {
    let app: INestApplication;
    let jwt: JwtService;
    let f: ReturnType<typeof configuracionFixture>;
    const raiz = '/api/configuracion-sistema';
    const globales = { crearTicketActivo: true, solicitudesRecursosActivo: true, reportesActivos: true, historialActivo: true };
    beforeEach(async () => {
        f = configuracionFixture();
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ConfiguracionRepository).useValue(f.repo)
            .overrideProvider(ConfiguracionSistemaService).useValue(f.inicial).compile();
        app = mod.createNestApplication({ logger: false });
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    function get(ruta = raiz, rol = 'ADMIN') {
        return request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${jwt.sign({ rol, usuarioId: 30, sub: 'admin@example.test' })}`);
    }
    function put(body: unknown, rol = 'ADMIN') {
        return request(app.getHttpServer()).put(raiz).set('Authorization', `Bearer ${jwt.sign({ rol, usuarioId: 30, sub: 'admin@example.test' })}`).send(body as object);
    }
    it.each([raiz, `${raiz}/auditoria`])('sin token GET %s -> 401', async (ruta) => { await request(app.getHttpServer()).get(ruta).expect(401); });
    it('sin token PUT -> 401', async () => { await request(app.getHttpServer()).put(raiz).send(globales).expect(401); });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE', 'OTRO'])('%s autenticado puede leer configuracion', async (rol) => {
        const res = await get(raiz, rol).expect(200);
        expect(res.body).toEqual(Object.fromEntries(FLAGS_CONFIGURACION.map(([campo]) => [campo, true])));
        expect(res.body).not.toHaveProperty('id');
        expect(res.body).not.toHaveProperty('varianteVisual');
    });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE', 'OTRO'])('%s no actualiza ni consulta auditoria', async (rol) => {
        await put(globales, rol).expect(403);
        await get(`${raiz}/auditoria`, rol).expect(403);
        expect(f.repo.transaction).not.toHaveBeenCalled();
        expect(f.repo.obtenerAuditoria).not.toHaveBeenCalled();
    });
    it('defaults solo cuando falta, lecturas repetidas/concurrentes no duplican ni auditan', async () => {
        f.estado.configuracion = null;
        const respuestas = await Promise.all(Array.from({ length: 4 }, () => get().expect(200)));
        expect(respuestas.every((r) => Object.values(r.body).every((v) => v === true))).toBe(true);
        expect(f.estado.creaciones).toBe(1);
        expect(f.estado.configuracion).toMatchObject({ varianteVisual: 'A' });
        expect(f.auditoria).toHaveLength(0);
    });
    it('configuracion existente desactivada/visual B no se sobrescribe en lecturas', async () => {
        Object.assign(f.estado.configuracion!, { crearTicketActivo: false, reportesCliente: false, varianteVisual: 'B' });
        for (let i = 0; i < 2; i++) expect((await get().expect(200)).body).toMatchObject({ crearTicketActivo: false, reportesCliente: false });
        expect(f.estado.configuracion?.varianteVisual).toBe('B');
        expect(f.estado.creaciones).toBe(0);
        expect(f.repo.update).not.toHaveBeenCalled();
    });
    it('ADMIN actualiza y audita un registro por campo, usuario/fecha y snapshots globales', async () => {
        const res = await put({ ...globales, crearTicketActivo: false, reportesCliente: false, solicitudesRecursosSupervisor: false }).expect(200);
        expect(res.body).toMatchObject({ crearTicketActivo: false, reportesCliente: false, solicitudesRecursosSupervisor: false });
        expect(f.auditoria).toHaveLength(3);
        expect(f.auditoria.map((a) => [a.modulo, a.rol])).toEqual([['CREAR_TICKET', 'GLOBAL'], ['SOLICITUDES_RECURSOS', 'SUPERVISOR'], ['REPORTES', 'CLIENTE']]);
        for (const a of f.auditoria) {
            expect(a).toMatchObject({ usuarioId: 30, usuarioNombre: 'Admin Prueba', usuarioCorreo: 'admin@example.test', valorAnterior: 'true', valorNuevo: 'false',
                crearTicketAnterior: true, crearTicketNuevo: false, reportesAnterior: true, reportesNuevo: true,
                historialAnterior: true, historialNuevo: true, varianteAnterior: 'A', varianteNueva: 'A' });
            expect(a.fechaCambio).toBeInstanceOf(Temporal.PlainDateTime);
        }
    });
    it('los veinte cambios se auditan con modulo/rol correctos', async () => {
        const datos = Object.fromEntries(FLAGS_CONFIGURACION.map(([campo]) => [campo, false]));
        await put(datos).expect(200);
        expect(f.auditoria).toHaveLength(20);
        expect(f.auditoria.map((a) => [a.modulo, a.rol])).toEqual(FLAGS_CONFIGURACION.map(([, modulo, rol]) => [modulo, rol]));
    });
    it('sin cambios no escribe ni genera auditoria; nulos/ausentes conservan permisos', async () => {
        Object.assign(f.estado.configuracion!, { crearTicketCliente: false });
        await put({ ...globales, crearTicketCliente: null }).expect(200);
        await put(globales).expect(200);
        expect(f.estado.configuracion?.crearTicketCliente).toBe(false);
        expect(f.auditoria).toHaveLength(0);
        expect(f.repo.update).not.toHaveBeenCalled();
        expect(f.repo.usuario).not.toHaveBeenCalled();
    });
    it.each(FLAGS_CONFIGURACION.slice(0, 4).map(([campo]) => campo))('global %s obligatorio', async (campo) => {
        const datos = { ...globales, [campo]: null };
        await put(datos).expect(400);
        expect(f.repo.transaction).not.toHaveBeenCalled();
    });
    it.each([{}, [], { ...globales, reportesCliente: 'true' }, { ...globales, crearTicketActivo: 1 },
        { ...globales, historialAdmin: {} }])('actualizacion invalida %j -> 400', async (datos) => {
        await put(datos).expect(400);
        expect(f.auditoria).toHaveLength(0);
        expect(f.estado.configuracion?.crearTicketActivo).toBe(true);
    });
    it('campos ajenos/id/variante/SMTP ignorados, no persistidos ni expuestos', async () => {
        Object.assign(f.estado.configuracion!, { varianteVisual: 'B' });
        const res = await put({ ...globales, historialAgente: false, id: 999, varianteVisual: 'A', MAIL_PASSWORD: 'simulado', password: 'simulado' }).expect(200);
        expect(f.estado.configuracion?.id).toBe(7);
        expect(f.estado.configuracion?.varianteVisual).toBe('B');
        expect(res.text).not.toMatch(/password|MAIL|variante|simulado/i);
        const historial = await get(`${raiz}/auditoria`).expect(200);
        expect(historial.text).not.toMatch(/password|MAIL|variante|simulado/i);
        expect(Object.keys(historial.body[0]).sort()).toEqual(['crearTicketAnterior', 'crearTicketNuevo', 'fechaCambio', 'historialAnterior', 'historialNuevo',
            'id', 'modulo', 'reportesAnterior', 'reportesNuevo', 'rol', 'usuarioCorreo', 'usuarioId', 'usuarioNombre', 'valorAnterior', 'valorNuevo'].sort());
    });
    it('auditoria vacia devuelve [] y no crea configuracion', async () => {
        f.estado.configuracion = null;
        expect((await get(`${raiz}/auditoria`).expect(200)).body).toEqual([]);
        expect(f.estado.creaciones).toBe(0);
    });
    it('multiples actualizaciones mantienen historial y orden descendente', async () => {
        await put({ ...globales, reportesCliente: false }).expect(200);
        f.auditoria[0]!.fechaCambio = Temporal.Now.plainDateTimeISO().subtract({ hours: 1 });
        await put({ ...globales, reportesCliente: true }).expect(200);
        const res = await get(`${raiz}/auditoria`).expect(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0]).toMatchObject({ valorAnterior: 'false', valorNuevo: 'true' });
        expect(res.body[1]).toMatchObject({ valorAnterior: 'true', valorNuevo: 'false' });
    });
    it('fallo auditoria revierte configuracion y todos sus registros', async () => {
        f.repo.auditoria.mockRejectedValueOnce(new Error('persistencia simulada'));
        await put({ ...globales, crearTicketActivo: false }).expect(500);
        expect(f.estado.configuracion?.crearTicketActivo).toBe(true);
        expect(f.auditoria).toHaveLength(0);
        const guardar = f.repo.auditoria.getMockImplementation()!;
        f.repo.auditoria.mockImplementationOnce(guardar).mockRejectedValueOnce(new Error('persistencia simulada'));
        await put({ ...globales, crearTicketActivo: false, reportesCliente: false }).expect(500);
        expect(f.estado.configuracion?.crearTicketActivo).toBe(true);
        expect(f.auditoria).toHaveLength(0);
    });
    it('fallo al auditar primera actualizacion tambien revierte inicializacion', async () => {
        f.estado.configuracion = null;
        f.repo.auditoria.mockRejectedValueOnce(new Error('persistencia simulada'));
        await put({ ...globales, crearTicketActivo: false }).expect(500);
        expect(f.estado.configuracion).toBeNull();
        expect(f.estado.creaciones).toBe(0);
    });
    it('actualizaciones concurrentes conservan ambos cambios y no duplican configuracion', async () => {
        await Promise.all([put({ ...globales, reportesCliente: false }).expect(200), put({ ...globales, historialAgente: false }).expect(200)]);
        expect(f.estado.configuracion).toMatchObject({ reportesCliente: false, historialAgente: false });
        expect(f.auditoria).toHaveLength(2);
        expect(f.estado.creaciones).toBe(0);
    });
    it('auditoria conserva compatibilidad de registros antiguos con valores detallados null', async () => {
        await put({ ...globales, crearTicketActivo: false }).expect(200);
        Object.assign(f.auditoria[0]!, { modulo: null, rol: null, valorAnterior: null, valorNuevo: null, usuarioId: null });
        const res = await get(`${raiz}/auditoria`).expect(200);
        expect(res.body[0]).toMatchObject({ modulo: null, rol: null, valorAnterior: null, valorNuevo: null, usuarioId: null });
    });
    it('actor sin usuario en base conserva correo como nombre, id JWT opcional', async () => {
        const token = jwt.sign({ sub: 'noexiste@example.test', rol: 'ADMIN' });
        await request(app.getHttpServer()).put(raiz).set('Authorization', `Bearer ${token}`).send({ ...globales, reportesCliente: false }).expect(200);
        expect(f.auditoria[0]).toMatchObject({ usuarioId: null, usuarioCorreo: 'noexiste@example.test', usuarioNombre: 'noexiste@example.test' });
    });
});
