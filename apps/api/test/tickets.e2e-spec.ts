import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { TicketsModule } from '../src/tickets/tickets.module.js';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import { db } from '../src/prisma/db.js';
import { ticketsFixture } from './tickets-fixture.js';
import { ConfiguracionSistemaService } from '../src/configuracion/configuracion-sistema.service.js';

describe('Tickets HTTP: permisos y flujo Spring Boot', () => {
    let app: INestApplication;
    let jwt: JwtService;
    let f: ReturnType<typeof ticketsFixture>;
    beforeEach(async () => {
        f = ticketsFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: f.UsuarioProyectos() });
        const mod = await Test.createTestingModule({ imports: [TicketsModule] })
            .overrideProvider(TicketsRepository).useValue(f.repo)
            .overrideProvider(ConfiguracionSistemaService).useValue({ obtenerOCrear: f.repo.configuracion }).compile();
        app = mod.createNestApplication();
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    function http(method: 'get' | 'post' | 'put', path: string, rol = 'ADMIN', usuarioId = 30) {
        return request(app.getHttpServer())[method](path)
            .set('Authorization', `Bearer ${jwt.sign({ rol, usuarioId })}`);
    }
    it.each(['', '/1', '/1/asignar', '/1/estado', '/1/prioridad'])('requiere JWT: %s', async (path) => {
        const method = path.includes('/1/') ? 'put' : 'get';
        await request(app.getHttpServer())[method](`/api/tickets${path}`).expect(401);
    });
    it('POST requiere JWT', async () => { await request(app.getHttpServer()).post('/api/tickets').send(f.crear).expect(401); });
    it.each(['ADMIN', 'SUPERVISOR', 'CLIENTE'])('%s lista tickets permitidos', async (rol) => {
        const res = await http('get', '/api/tickets', rol, rol === 'CLIENTE' ? 10 : 30).expect(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).not.toHaveProperty('password');
    });
    it('AGENTE lista solo los asignados', async () => {
        await http('get', '/api/tickets', 'AGENTE', 20).expect(200).expect([]);
        await http('put', '/api/tickets/1/asignar').send({ agenteId: 20 }).expect(200);
        const res = await http('get', '/api/tickets', 'AGENTE', 20).expect(200);
        expect(res.body).toHaveLength(1);
    });
    it('CLIENTE conserva detalle propio sin acceso al proyecto', async () => {
        f.asignaciones.splice(0);
        Object.assign(db.orm.public, { UsuarioProyectos: f.UsuarioProyectos() });
        await http('get', '/api/tickets/1', 'CLIENTE', 10).expect(200);
        await http('get', '/api/tickets', 'CLIENTE', 10).expect(200).expect([]);
        await http('get', '/api/tickets/1', 'CLIENTE', 99).expect(403);
    });
    it.each(['SUPERVISOR', 'AGENTE'])('%s requiere proyecto activo y asignacion', async (rol) => {
        await http('get', '/api/tickets/1', rol, 99).expect(403);
        f.proyecto.estado = false;
        await http('get', '/api/tickets/1', rol, 30).expect(403);
    });
    it('AGENTE no puede acceder al ticket de otro agente', async () => {
        await http('get', '/api/tickets/1', 'AGENTE', 20).expect(403);
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s crea ticket con prioridad y SLA calculados', async (rol) => {
        const id = rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30;
        const res = await http('post', '/api/tickets', rol, id).send(f.crear).expect(201);
        expect(res.body).toMatchObject({ id: 2, estado: 'NUEVO', prioridad: 'P1_CRITICA', agenteId: null });
        expect(f.historial[0]).toMatchObject({ accion: 'CREACION_TICKET', usuarioId: id });
        expect(f.rows[1]!.fechaCreacion!.until(f.rows[1]!.fechaLimiteResolucion!).total('hours')).toBe(4);
    });
    it('CLIENTE no puede crear a nombre de otro cliente', async () => {
        await http('post', '/api/tickets', 'CLIENTE', 20).send(f.crear).expect(403);
    });
    it('respeta desactivacion global incluso para ADMIN', async () => {
        f.repo.configuracion.mockResolvedValue({ crearTicketActivo: false, crearTicketCliente: true,
            crearTicketAgente: true, crearTicketSupervisor: true, crearTicketAdmin: true });
        await http('post', '/api/tickets').send(f.crear).expect(403);
    });
    it('respeta permiso de creacion por rol', async () => {
        f.repo.configuracion.mockResolvedValue({ crearTicketActivo: true, crearTicketCliente: false,
            crearTicketAgente: true, crearTicketSupervisor: true, crearTicketAdmin: false });
        await http('post', '/api/tickets', 'CLIENTE', 10).send(f.crear).expect(403);
        await http('post', '/api/tickets').send(f.crear).expect(201);
    });
    it('rechaza cliente inactivo y proyecto no disponible', async () => {
        f.cliente.estado = false;
        await http('post', '/api/tickets').send(f.crear).expect(400);
        f.cliente.estado = true;
        f.proyecto.compania.estado = false;
        await http('post', '/api/tickets').send(f.crear).expect(403);
    });
    it('crea recurso separado con SLA de resolucion no aplicable', async () => {
        const res = await http('post', '/api/tickets').send({ ...f.crear, tipoAtencion: 'RECURSO_EXTERNO',
            solicitudRecurso: { categoria: 'equipo', recurso: 'Monitor', cantidad: 2 } }).expect(201);
        expect(res.body).toMatchObject({ fechaLimiteResolucion: null, estadoSlaResolucion: 'NO_APLICA' });
        expect(f.recursos[0]).toMatchObject({ estadoRecurso: 'NUEVO', categoria: 'EQUIPO' });
        expect(f.historial.map((h) => h.accion)).toEqual(['RECURSO_CREADO', 'CREACION_TICKET']);
    });
    it('requiere solicitud para recurso externo', async () => {
        await http('post', '/api/tickets').send({ ...f.crear, tipoAtencion: 'RECURSO_EXTERNO' }).expect(400);
    });
    it.each(['CLIENTE', 'AGENTE'])('%s no puede asignar', async (rol) => {
        await http('put', '/api/tickets/1/asignar', rol, 10).send({ agenteId: 20 }).expect(403);
    });
    it.each(['estado', 'prioridad'])('CLIENTE no puede cambiar %s', async (ruta) => {
        await http('put', `/api/tickets/1/${ruta}`, 'CLIENTE', 10).send({}).expect(403);
    });
    it('asignar inicia y cerrar requiere nota, registra fechas y SLA', async () => {
        const asignado = await http('put', '/api/tickets/1/asignar', 'SUPERVISOR').send({ agenteId: 20 }).expect(200);
        expect(asignado.body).toMatchObject({ estado: 'EN_PROGRESO', agenteId: 20, fechaPrimeraRespuesta: null });
        await http('put', '/api/tickets/1/estado', 'AGENTE', 20).send({ estado: 'CERRADO' }).expect(400);
        const cerrado = await http('put', '/api/tickets/1/estado', 'AGENTE', 20)
            .send({ estado: 'cerrado', notaResolucion: ' Solucionado ' }).expect(200);
        expect(cerrado.body.fechaCierre).toBeTruthy();
        expect(cerrado.body.fechaResolucion).toBe(cerrado.body.fechaCierre);
        expect(cerrado.body.slaResolucionCumplido).toBe(true);
        expect(f.historial.at(-1)!.descripcion).toContain('Nota de cierre: Solucionado');
    });
    it('recurso externo se asigna sin alterar estadoRecurso y bloquea cierre operativo', async () => {
        f.ticket.tipoAtencion = 'RECURSO_EXTERNO' as typeof f.ticket.tipoAtencion;
        await http('put', '/api/tickets/1/asignar').send({ agenteId: 20 }).expect(200);
        expect(f.repo.recurso).not.toHaveBeenCalled();
        await http('put', '/api/tickets/1/estado').send({ estado: 'CERRADO', notaResolucion: 'Listo' }).expect(409);
    });
    it('bloquea primera asignacion fuera de NUEVO y agente inactivo', async () => {
        f.agente.estado = false;
        await http('put', '/api/tickets/1/asignar').send({ agenteId: 20 }).expect(400);
        f.agente.estado = true;
        f.ticket.estado = 'RESUELTO' as typeof f.ticket.estado;
        await http('put', '/api/tickets/1/asignar').send({ agenteId: 20 }).expect(400);
    });
    it.each(['ASIGNADO', 'RESUELTO', 'CERRADO'])('no crea transicion NUEVO -> %s', async (estado) => {
        await http('put', '/api/tickets/1/estado').send({ estado, notaResolucion: 'Nota' }).expect(400);
    });
    it('permite cierre de RESUELTO antiguo conservando fechaResolucion', async () => {
        f.ticket.estado = 'RESUELTO' as typeof f.ticket.estado;
        f.ticket.fechaResolucion = f.ticket.fechaCreacion;
        const res = await http('put', '/api/tickets/1/estado').send({ estado: 'CERRADO', notaResolucion: 'Nota' }).expect(200);
        expect(res.body.fechaResolucion).toBe(f.ticket.fechaCreacion!.toString());
    });
    it('cambia prioridad recalculando desde creacion y verifica autor', async () => {
        await http('put', '/api/tickets/1/prioridad').send({ prioridad: 'P1_CRITICA', usuarioId: 99 }).expect(403);
        const res = await http('put', '/api/tickets/1/prioridad').send({ prioridad: 'p1_critica', usuarioId: 30, justificacion: 'Urgente' }).expect(200);
        expect(res.body.prioridad).toBe('P1_CRITICA');
        expect(f.ticket.fechaCreacion!.until(f.ticket.fechaLimiteRespuesta!).total('minutes')).toBe(30);
        expect(f.historial.at(-1)!.descripcion).toContain('Justificación: Urgente');
    });
    it('rechaza prioridad invalida o sin usuario', async () => {
        await http('put', '/api/tickets/1/prioridad').send({ prioridad: 'OTRA', usuarioId: 30 }).expect(400);
        await http('put', '/api/tickets/1/prioridad').send({ prioridad: 'P1_CRITICA' }).expect(400);
    });
    it('inicializa y persiste SLA antiguo al consultar', async () => {
        f.ticket.fechaLimiteRespuesta = null;
        await http('get', '/api/tickets/1').expect(200);
        expect(f.repo.update).toHaveBeenCalled();
        expect(f.ticket.fechaLimiteRespuesta).toBeTruthy();
    });
    it.each([undefined, null, '', 'operativo'])('creación legacy tipoAtencion %j ->201', async (tipoAtencion) => {
        const res = await http('post', '/api/tickets').send({ ...f.crear, tipoAtencion }).expect(201);
        expect(res.body.tipoAtencion).toBe('OPERATIVO');
    });
    it.each(['estado', 'prioridad', 'asignar'])('PUT ticket inexistente %s ->400 Spring', async (operacion) => {
        await http('put', `/api/tickets/999/${operacion}`).send({ estado: 'EN_PROGRESO', prioridad: 'P3_MEDIA', usuarioId: 30, agenteId: 20 }).expect(400);
    });
    it('400 legacy y validacion de id/cuerpo', async () => {
        await http('get', '/api/tickets/999').expect(400);
        await http('get', '/api/tickets/abc').expect(400);
        await http('get', '/api/tickets/0').expect(400);
        await http('post', '/api/tickets').send({}).expect(400);
        await http('put', '/api/tickets/1/asignar').send({ agenteId: '20' }).expect(400);
    });
    it('rechaza roles desconocidos y tokens sin usuarioId', async () => {
        await http('get', '/api/tickets', 'OTRO').expect(403);
        await request(app.getHttpServer()).get('/api/tickets').set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN' })}`).expect(401);
    });
});
