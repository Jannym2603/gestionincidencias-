import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Temporal } from 'temporal-polyfill';
import { AppModule } from '../src/app.module.js';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import { ConfiguracionSistemaService } from '../src/configuracion/configuracion-sistema.service.js';
import { NotificacionService } from '../src/notificaciones/notificacion.service.js';
import { SolicitudesRecursosRepository } from '../src/solicitudes-recursos/solicitudes-recursos.repository.js';
import { db } from '../src/prisma/db.js';
import { solicitudesFixture } from './solicitudes-recursos-fixture.js';

describe('Solicitudes de recursos HTTP', () => {
    let app: INestApplication;
    let f: ReturnType<typeof solicitudesFixture>;
    let jwt: JwtService;
    beforeEach(async () => {
        f = solicitudesFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: f.f.UsuarioProyectos() });
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(TicketsRepository).useValue(f.f.repo)
            .overrideProvider(SolicitudesRecursosRepository).useValue(f.repo)
            .overrideProvider(ConfiguracionSistemaService).useValue(f.configService)
            .overrideProvider(NotificacionService).useValue(f.notificaciones).compile();
        app = mod.createNestApplication({ logger: false });
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    const raiz = '/api/solicitudes-recursos';
    function http(method: 'get' | 'put' | 'post', path = raiz, rol = 'ADMIN', usuarioId = 30) {
        return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${jwt.sign({ rol, usuarioId })}`);
    }
    it.each([raiz, `${raiz}/1`, `${raiz}/ticket/1`])('sin token GET %s -> 401', async (path) => {
        await request(app.getHttpServer()).get(path).expect(401);
    });
    it('sin token PUT -> 401', async () => { await request(app.getHttpServer()).put(`${raiz}/1`).send({}).expect(401); });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s consulta lista, id y ticket', async (rol) => {
        const id = rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30;
        for (const path of [raiz, `${raiz}/1`, `${raiz}/ticket/1`]) await http('get', path, rol, id).expect(200);
    });
    it.each([`${raiz}/999`, `${raiz}/ticket/999`])('%s inexistente -> 404', async (path) => { await http('get', path).expect(404); });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s no accede a ticket ajeno y lista filtra', async (rol) => {
        const id = rol === 'CLIENTE' ? 11 : rol === 'AGENTE' ? 21 : 31;
        await http('get', `${raiz}/1`, rol, id).expect(403);
        await http('get', `${raiz}/ticket/1`, rol, id).expect(403);
        const res = await http('get', raiz, rol, id).expect(200);
        expect(res.body).toEqual([]);
    });
    it('AGENTE requiere asignacion y proyecto activo', async () => {
        f.f.ticket.agenteAsignadoId = null;
        await http('get', `${raiz}/1`, 'AGENTE', 20).expect(403);
        f.f.ticket.agenteAsignadoId = 20;
        f.f.proyecto.estado = false;
        await http('get', `${raiz}/1`, 'AGENTE', 20).expect(403);
    });
    it('CLIENTE mantiene acceso a ticket propio con proyecto inactivo; ADMIN acceso global', async () => {
        f.f.proyecto.estado = false;
        await http('get', `${raiz}/1`, 'CLIENTE', 10).expect(200);
        await http('get', `${raiz}/1`).expect(200);
    });
    it.each(['AGENTE', 'CLIENTE'])('%s no administra', async (rol) => {
        await http('put', `${raiz}/1`, rol, rol === 'AGENTE' ? 20 : 10).send({ proveedor: 'Proveedor' }).expect(403);
        expect(f.f.repo.updateRecurso).not.toHaveBeenCalled();
    });
    it('SUPERVISOR solo administra sus proyectos', async () => {
        await http('put', `${raiz}/1`, 'SUPERVISOR', 31).send({}).expect(403);
        await http('put', `${raiz}/1`, 'SUPERVISOR').send({ proveedor: ' Proveedor ' }).expect(200);
        expect(f.solicitud.proveedor).toBe('Proveedor');
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('configuracion global deshabilitada bloquea %s', async (rol) => {
        f.config.solicitudesRecursosActivo = false;
        await http('get', raiz, rol, rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30).expect(403);
    });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('configuracion por rol bloquea %s', async (rol) => {
        Object.assign(f.config, { [`solicitudesRecursos${rol.charAt(0)}${rol.slice(1).toLowerCase()}`]: false });
        await http('get', raiz, rol, rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30).expect(403);
    });
    it('ADMIN ignora flag especifico, conserva global', async () => {
        f.config.solicitudesRecursosAdmin = false;
        await http('get').expect(200);
    });
    it('contrato DTO no expone entidades, correos ni marcador interno', async () => {
        const res = await http('get', `${raiz}/1`).expect(200);
        expect(res.body).toMatchObject({ ticketId: 1, numeroTicket: 'INC-2026-0001', recurso: 'Monitor', retrasada: false, situacionEntrega: 'SIN_FECHA' });
        for (const campo of ['ticket', 'cliente', 'password', 'correo', 'fechaNotificacionRetraso']) expect(res.body).not.toHaveProperty(campo);
    });
    it('flujo completo fechas automaticas e historial, solo CERRADO cierra ticket', async () => {
        for (const estado of ['EN_VALIDACION', 'SOLICITADO_PROVEEDOR', 'ESPERANDO_PROVEEDOR', 'RECIBIDO', 'ENTREGADO', 'CERRADO']) {
            await http('put', `${raiz}/1`).send({ estadoRecurso: estado, proveedor: 'Proveedor', fechaEstimadaEntrega: '2026-10-08T12:00:00' }).expect(200);
            if (estado !== 'CERRADO') expect(f.f.ticket.estado).toBe('NUEVO');
        }
        expect(f.solicitud.fechaSolicitudProveedor).not.toBeNull();
        expect(f.solicitud.fechaRecepcion).not.toBeNull();
        expect(f.solicitud.fechaEntregaCliente).not.toBeNull();
        expect(f.f.ticket.estado).toBe('CERRADO');
        expect(f.f.ticket.fechaCierre).not.toBeNull();
        expect(f.f.ticket.fechaResolucion).not.toBeNull();
        expect(f.f.historial.filter((h) => h.accion === 'CIERRE_TICKET_RECURSO')).toHaveLength(1);
        expect(f.notificaciones.notificarCambioEstadoRecurso).toHaveBeenCalledTimes(6);
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'CERRADO' }).expect(200);
        expect(f.f.historial.filter((h) => h.accion === 'CIERRE_TICKET_RECURSO')).toHaveLength(1);
        expect(f.notificaciones.notificarCambioEstadoRecurso).toHaveBeenCalledTimes(6);
    });
    it('CANCELADO no cierra ticket y no permite reabrir solicitud', async () => {
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'CANCELADO' }).expect(200);
        expect(f.f.ticket.estado).toBe('NUEVO');
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'EN_VALIDACION' }).expect(400);
    });
    it.each([{ estadoRecurso: 'RETRASADO' }, { estadoRecurso: 'CERRADO' }, { cantidad: 0 }, { cantidad: 1.5 },
        { categoria: ' ' }, { recurso: '' }, { proveedor: 5 }, { fechaEstimadaEntrega: '2026-02-30T12:00' },
        { fechaEstimadaEntrega: '2026-10-08T12:00Z' }, { fechaRecepcion: 'invalida' }, { proveedor: 'x'.repeat(151) }])('rechaza body invalido %j', async (body) => {
        await http('put', `${raiz}/1`).send(body).expect(400);
        expect(f.solicitud.estadoRecurso).toBe('NUEVO');
    });
    it('proveedor y fecha estimada requeridos para avanzar', async () => {
        f.solicitud.estadoRecurso = 'EN_VALIDACION' as typeof f.solicitud.estadoRecurso;
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'SOLICITADO_PROVEEDOR' }).expect(400);
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'SOLICITADO_PROVEEDOR', proveedor: 'Proveedor' }).expect(200);
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'ESPERANDO_PROVEEDOR' }).expect(400);
    });
    it('cierre requiere entrega y preserva fechas ticket existentes', async () => {
        f.solicitud.estadoRecurso = 'ENTREGADO' as typeof f.solicitud.estadoRecurso;
        f.solicitud.proveedor = 'Proveedor' as typeof f.solicitud.proveedor;
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'CERRADO' }).expect(400);
        const fecha = Temporal.PlainDateTime.from('2026-10-01T08:00');
        f.f.ticket.fechaCierre = fecha;
        f.f.ticket.fechaResolucion = fecha;
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'CERRADO', fechaEntregaCliente: '2026-10-02T12:00' }).expect(200);
        expect(f.f.ticket.fechaCierre).toBe(fecha);
        expect(f.f.ticket.fechaResolucion).toBe(fecha);
    });
    it('reprogramacion conserva original, retraso usa original y no cambia estado', async () => {
        const pasada = Temporal.Now.plainDateTimeISO().subtract({ days: 2 });
        await http('put', `${raiz}/1`).send({ fechaEstimadaEntrega: pasada.toString() }).expect(200);
        const res = await http('put', `${raiz}/1`).send({ fechaEstimadaEntrega: pasada.add({ days: 10 }).toString() }).expect(200);
        expect(res.body).toMatchObject({ retrasada: true, situacionEntrega: 'RETRASADO', diasRetraso: 2, estadoRecurso: 'NUEVO' });
        expect(f.solicitud.fechaEstimadaEntregaOriginal?.equals(pasada)).toBe(true);
    });
    it('normaliza campos, nulos no borran, blancos borran opcionales', async () => {
        await http('put', `${raiz}/1`).send({ categoria: ' piezas ', recurso: ' Teclado ', cantidad: 2,
            proveedor: ' Proveedor ', motivoRetraso: ' Logistica ', detalleRetraso: ' Detalle ', observaciones: ' Nota ' }).expect(200);
        expect(f.solicitud).toMatchObject({ categoria: 'PIEZAS', recurso: 'Teclado', cantidad: 2, proveedor: 'Proveedor', motivoRetraso: 'Logistica' });
        await http('put', `${raiz}/1`).send({ proveedor: null }).expect(200);
        expect(f.solicitud.proveedor).toBe('Proveedor');
        await http('put', `${raiz}/1`).send({ proveedor: ' ' }).expect(200);
        expect(f.solicitud.proveedor).toBeNull();
        expect(f.notificaciones.notificarCambioEstadoRecurso).not.toHaveBeenCalled();
    });
    it('fallo correo no rompe actualizacion; rollback historial impide correo', async () => {
        f.notificaciones.notificarCambioEstadoRecurso.mockRejectedValueOnce(new Error('SMTP simulado'));
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'EN_VALIDACION' }).expect(200);
        f.notificaciones.notificarCambioEstadoRecurso.mockClear();
        f.f.repo.historial.mockRejectedValueOnce(new Error('persistencia simulada'));
        await http('put', `${raiz}/1`).send({ estadoRecurso: 'SOLICITADO_PROVEEDOR', proveedor: 'Proveedor' }).expect(500);
        expect(f.solicitud.estadoRecurso).toBe('EN_VALIDACION');
        expect(f.solicitud.proveedor).toBeNull();
        expect(f.notificaciones.notificarCambioEstadoRecurso).not.toHaveBeenCalled();
    });
    it('creacion va por Tickets, solicitud unica NUEVO y consulta inmediata', async () => {
        const res = await http('post', '/api/tickets', 'CLIENTE', 10).send({ ...f.f.crear, tipoAtencion: 'RECURSO_EXTERNO',
            solicitudRecurso: { categoria: 'Equipo', recurso: 'Monitor', cantidad: 2 } }).expect(201);
        const solicitud = await http('get', `${raiz}/ticket/${res.body.id}`, 'CLIENTE', 10).expect(200);
        expect(solicitud.body).toMatchObject({ ticketId: res.body.id, estadoRecurso: 'NUEVO', categoria: 'EQUIPO', cantidad: 2 });
        expect(f.f.historial.some((h) => h.accion === 'RECURSO_CREADO')).toBe(true);
        await http('post', raiz).send({ ticketId: 1 }).expect(404);
    });
    it.each([null, { categoria: '', recurso: 'Monitor', cantidad: 1 }, { categoria: 'Equipo', recurso: 'Monitor', cantidad: 0 }])('creacion invalida %j no persiste', async (solicitudRecurso) => {
        await http('post', '/api/tickets').send({ ...f.f.crear, tipoAtencion: 'RECURSO_EXTERNO', solicitudRecurso }).expect(400);
        expect(f.rows).toHaveLength(1);
    });
    it('identidad ausente y rol desconocido no acceden', async () => {
        await request(app.getHttpServer()).get(raiz).set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN' })}`).expect(401);
        await http('get', raiz, 'OTRO').expect(403);
    });
    it.each(['0', '-1', 'abc', '2147483648'])('id invalido %s -> 400', async (id) => { await http('get', `${raiz}/${id}`).expect(400); });
});
