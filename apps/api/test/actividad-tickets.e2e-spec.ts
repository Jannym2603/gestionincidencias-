import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { Temporal } from 'temporal-polyfill';
import { AppModule } from '../src/app.module.js';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import { ComentariosRepository } from '../src/comentarios/comentarios.repository.js';
import { HistorialTicketsRepository } from '../src/historial-tickets/historial-tickets.repository.js';
import { AdjuntosRepository } from '../src/adjuntos/adjuntos.repository.js';
import type { Adjunto } from '../src/adjuntos/adjuntos.repository.js';
import { CARPETA_ADJUNTOS, TAMANIO_MAXIMO } from '../src/adjuntos/adjuntos.service.js';
import { CARPETAS_ADJUNTOS_LEGACY } from '../src/adjuntos/almacenamiento.js';
import { ConfiguracionSistemaService } from '../src/configuracion/configuracion-sistema.service.js';
import { NotificacionService } from '../src/notificaciones/notificacion.service.js';
import { db } from '../src/prisma/db.js';
import { actividadFixture } from './actividad-ticket-fixture.js';

describe('Comentarios, historial y adjuntos HTTP', () => {
    let app: INestApplication;
    let f: ReturnType<typeof actividadFixture>;
    let jwt: JwtService;
    let temporal: string;
    let carpeta: string;
    const raizPruebas = resolve('test');
    beforeEach(async () => {
        f = actividadFixture();
        temporal = await mkdtemp(join(raizPruebas, '.actividad-'));
        carpeta = join(temporal, 'adjuntos');
        Object.assign(db.orm.public, { UsuarioProyectos: f.tickets.UsuarioProyectos() });
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(TicketsRepository).useValue(f.tickets.repo)
            .overrideProvider(ComentariosRepository).useValue(f.comentariosRepo)
            .overrideProvider(HistorialTicketsRepository).useValue(f.historialRepo)
            .overrideProvider(AdjuntosRepository).useValue(f.adjuntosRepo)
            .overrideProvider(ConfiguracionSistemaService).useValue(f.configService)
            .overrideProvider(NotificacionService).useValue(f.notificaciones)
            .overrideProvider(CARPETA_ADJUNTOS).useValue(carpeta)
            .overrideProvider(CARPETAS_ADJUNTOS_LEGACY).useValue([join(temporal, 'legacy')]).compile();
        app = mod.createNestApplication({ logger: false });
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => {
        await app?.close();
        if (temporal) {
            const rel = relative(raizPruebas, resolve(temporal));
            if (!rel.startsWith('.actividad-') || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Directorio temporal fuera de la raiz de pruebas');
            await rm(temporal, { recursive: true, force: true, maxRetries: 3, retryDelay: 30 });
        }
    });
    function http(method: 'get' | 'post', path: string, rol = 'ADMIN', usuarioId = 30) {
        return request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${jwt.sign({ rol, usuarioId })}`);
    }

    it('descarga ruta absoluta histórica de carpeta autorizada sin mover datos ni exponerla', async () => {
        const upload = await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('contenido legado'), 'legado.txt').expect(200);
        const legacy = join(temporal, 'legacy'); await mkdir(legacy, { recursive: true });
        const archivo = join(legacy, 'historico.txt'); await writeFile(archivo, 'contenido legado');
        const row = f.adjuntos.find((a) => a.id === upload.body.id)!; row.rutaArchivo = archivo as Adjunto['rutaArchivo'];
        const res = await http('get', `/api/adjuntos/${row.id}/descargar`).expect(200); expect(res.text).toBe('contenido legado');
        expect(JSON.stringify((await http('get', '/api/adjuntos/ticket/1').expect(200)).body)).not.toContain(temporal);
    });
    const datosComentario = (id = 30, tipo = 'PUBLICO', ticketId = 1) => ({ ticketId, usuarioId: id, tipoComentario: tipo, contenido: ' Respuesta ' });
    async function archivoFisico(ticketId = 1, nombre = 'ejemplo.txt') {
        await mkdir(carpeta, { recursive: true });
        const ruta = join(carpeta, nombre);
        await writeFile(ruta, 'contenido de prueba');
        const row = { id: f.adjuntos.length + 1, ticketId, nombreArchivo: nombre, rutaArchivo: ruta,
            tipoArchivo: 'text/plain', tamanio: 19n, fechaSubida: Temporal.Now.plainDateTimeISO() } as Adjunto;
        f.adjuntos.push(row);
        return row;
    }

    it.each(['/api/comentarios', '/api/comentarios/ticket/1', '/api/historial-tickets', '/api/historial-tickets/ticket/1',
        '/api/adjuntos/ticket/1', '/api/adjuntos/1/descargar'])('sin token GET %s -> 401', async (path) => {
        await request(app.getHttpServer()).get(path).expect(401);
    });
    it.each(['/api/comentarios', '/api/adjuntos/ticket/1'])('sin token POST %s -> 401', async (path) => {
        await request(app.getHttpServer()).post(path).send({}).expect(401);
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s: ticket inexistente -> 404', async (modulo) => {
        await http('get', `/api/${modulo}/ticket/999`).expect(modulo === 'comentarios' ? 400 : 404);
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s: proyecto ajeno SUPERVISOR -> 403', async (modulo) => {
        await http('get', `/api/${modulo}/ticket/2`, 'SUPERVISOR').expect(403);
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s: ticket propio accesible CLIENTE, ajeno -> 403', async (modulo) => {
        await http('get', `/api/${modulo}/ticket/1`, 'CLIENTE', 10).expect(200);
        await http('get', `/api/${modulo}/ticket/2`, 'CLIENTE', 10).expect(403);
        await http('get', `/api/${modulo}/ticket/3`, 'CLIENTE', 10).expect(200);
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s: AGENTE requiere ticket asignado', async (modulo) => {
        await http('get', `/api/${modulo}/ticket/1`, 'AGENTE', 20).expect(200);
        f.tickets.ticket.agenteAsignadoId = null;
        await http('get', `/api/${modulo}/ticket/1`, 'AGENTE', 20).expect(403);
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s: proyecto/compania inactivos bloquean soporte', async (modulo) => {
        f.tickets.proyecto.estado = false;
        await http('get', `/api/${modulo}/ticket/1`, 'SUPERVISOR').expect(403);
        f.tickets.proyecto.estado = true;
        f.tickets.proyecto.compania.estado = false;
        await http('get', `/api/${modulo}/ticket/1`, 'AGENTE', 20).expect(403);
        await http('get', `/api/${modulo}/ticket/1`).expect(200);
    });
    it('CLIENTE ve solo PUBLICO y no puede publicar INTERNO ni suplantar usuario', async () => {
        const lista = await http('get', '/api/comentarios/ticket/1', 'CLIENTE', 10).expect(200);
        expect(lista.body.map((c: { id: number }) => c.id)).toEqual([1, 3]);
        await http('post', '/api/comentarios', 'CLIENTE', 10).send(datosComentario(10, 'INTERNO')).expect(403);
        await http('post', '/api/comentarios', 'CLIENTE', 10).send(datosComentario(30)).expect(403);
        expect(f.tickets.repo.comentario).not.toHaveBeenCalled();
    });
    it('CLIENTE crea PUBLICO sin marcar primera respuesta SLA', async () => {
        const creado = await http('post', '/api/comentarios', 'CLIENTE', 10).send(datosComentario(10)).expect(201);
        expect(creado.body).toMatchObject({ ticketId: 1, usuarioId: 10, contenido: 'Respuesta', tipoComentario: 'PUBLICO', nombreUsuario: 'Cliente Prueba' });
        expect(creado.body.fechaCreacion).toBeTruthy();
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBeNull();
        expect(f.tickets.historial.map((h) => h.accion)).toEqual(['COMENTARIO_AGREGADO']);
        expect(f.notificaciones.notificarComentarioPublico).toHaveBeenCalledOnce();
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE'])('%s crea PUBLICO registrando una sola primera respuesta', async (rol) => {
        const usuarioId = rol === 'AGENTE' ? 20 : 30;
        await http('post', '/api/comentarios', rol, usuarioId).send(datosComentario(usuarioId)).expect(201);
        const primera = f.tickets.ticket.fechaPrimeraRespuesta;
        expect(primera).toBeTruthy();
        expect(f.tickets.ticket.slaRespuestaCumplido).toBe(true);
        await http('post', '/api/comentarios', rol, usuarioId).send(datosComentario(usuarioId)).expect(201);
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBe(primera);
        expect(f.tickets.historial.filter((h) => h.accion === 'PRIMERA_RESPUESTA_SLA')).toHaveLength(1);
        expect(f.tickets.ticket.fechaActualizacion).toBeTruthy();
    });
    it('INTERNO de soporte no registra primera respuesta ni envia correo', async () => {
        await http('post', '/api/comentarios', 'SUPERVISOR').send(datosComentario(30, 'INTERNO')).expect(201);
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBeNull();
        expect(f.notificaciones.notificarComentarioPublico).not.toHaveBeenCalled();
    });
    it('normaliza tipo, calcula SLA faltante y detecta respuesta fuera de plazo', async () => {
        f.tickets.ticket.fechaCreacion = Temporal.PlainDateTime.from('2020-01-01T10:00');
        f.tickets.ticket.fechaLimiteRespuesta = null;
        await http('post', '/api/comentarios').send(datosComentario(30, ' publico ')).expect(201);
        expect(f.tickets.ticket.slaRespuestaCumplido).toBe(false);
        expect(f.tickets.ticket.fechaLimiteRespuesta!.toString()).toBe('2020-01-01T14:00:00');
    });
    it('rechaza comentario ajeno, ticket inexistente y DTO invalido', async () => {
        await http('post', '/api/comentarios', 'SUPERVISOR').send(datosComentario(30, 'PUBLICO', 2)).expect(403);
        await http('post', '/api/comentarios').send(datosComentario(30, 'PUBLICO', 999)).expect(400);
        await http('post', '/api/comentarios').send({ ...datosComentario(), contenido: ' ' }).expect(400);
        await http('post', '/api/comentarios').send({ ...datosComentario(), usuarioId: null }).expect(400);
        await http('post', '/api/comentarios').send(datosComentario(30, 'OTRO')).expect(400);
    });
    it('rollback elimina comentario, SLA e historial si falla persistencia; no envia correo', async () => {
        f.tickets.repo.historial.mockRejectedValueOnce(new Error('fallo simulado'));
        await http('post', '/api/comentarios').send(datosComentario()).expect(500);
        expect(f.comentarios).toHaveLength(5);
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBeNull();
        expect(f.tickets.historial).toHaveLength(0);
        expect(f.notificaciones.notificarComentarioPublico).not.toHaveBeenCalled();
    });
    it('error SMTP no revierte comentario confirmado', async () => {
        f.notificaciones.notificarComentarioPublico.mockRejectedValueOnce(new Error('SMTP simulado'));
        await http('post', '/api/comentarios').send(datosComentario()).expect(201);
        expect(f.comentarios).toHaveLength(6);
    });
    it('listado global de comentarios filtra proyectos SUPERVISOR y permite todos ADMIN', async () => {
        const admin = await http('get', '/api/comentarios').expect(200);
        expect(admin.body).toHaveLength(5);
        const supervisor = await http('get', '/api/comentarios', 'SUPERVISOR').expect(200);
        expect(supervisor.body).toHaveLength(3);
        await http('get', '/api/comentarios', 'CLIENTE', 10).expect(403);
        await http('get', '/api/comentarios', 'AGENTE', 20).expect(403);
    });
    it('historial ordenado DESC y CLIENTE solo eventos propios', async () => {
        const admin = await http('get', '/api/historial-tickets/ticket/1').expect(200);
        expect(admin.body.map((h: { id: number }) => h.id)).toEqual([3, 2, 1]);
        expect(admin.body[0]).toMatchObject({ usuarioId: null, nombreUsuario: null });
        const cliente = await http('get', '/api/historial-tickets/ticket/1', 'CLIENTE', 10).expect(200);
        expect(cliente.body.map((h: { id: number }) => h.id)).toEqual([1]);
    });
    it('historial consolidado ADMIN/SUPERVISOR filtrado; otros roles denegados', async () => {
        expect((await http('get', '/api/historial-tickets').expect(200)).body).toHaveLength(5);
        expect((await http('get', '/api/historial-tickets', 'SUPERVISOR').expect(200)).body).toHaveLength(3);
        await http('get', '/api/historial-tickets', 'CLIENTE', 10).expect(403);
        await http('get', '/api/historial-tickets', 'AGENTE', 20).expect(403);
    });
    it('historial deshabilitado globalmente bloquea incluso ADMIN', async () => {
        f.configuracion.historialActivo = false;
        await http('get', '/api/historial-tickets').expect(403);
        await http('get', '/api/historial-tickets/ticket/1').expect(403);
    });
    it.each(['CLIENTE', 'SUPERVISOR', 'AGENTE'])('historial deshabilitado para %s -> 403', async (rol) => {
        f.configuracion.historialCliente = false;
        f.configuracion.historialSupervisor = false;
        f.configuracion.historialAgente = false;
        await http('get', '/api/historial-tickets/ticket/1', rol, rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30).expect(403);
    });
    it('ADMIN ignora historialAdmin y no hay escritura manual de historial', async () => {
        f.configuracion.historialAdmin = false;
        await http('get', '/api/historial-tickets/ticket/1').expect(200);
        await http('post', '/api/historial-tickets').send({ accion: 'INVENTADO' }).expect(404);
    });
    it('historial expone eventos automaticos de Comentarios y Tickets', async () => {
        await http('post', '/api/comentarios').send(datosComentario()).expect(201);
        await request(app.getHttpServer()).put('/api/tickets/1/estado').set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN', usuarioId: 30 })}`)
            .send({ estado: 'CERRADO', notaResolucion: 'Listo' }).expect(200);
        const lista = await http('get', '/api/historial-tickets/ticket/1').expect(200);
        expect(lista.body.map((h: { accion: string }) => h.accion)).toEqual(expect.arrayContaining(['PRIMERA_RESPUESTA_SLA', 'COMENTARIO_AGREGADO', 'CAMBIO_ESTADO']));
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s sube, lista y descarga adjunto permitido', async (rol) => {
        const usuarioId = rol === 'CLIENTE' ? 10 : rol === 'AGENTE' ? 20 : 30;
        const subido = await http('post', '/api/adjuntos/ticket/1', rol, usuarioId).attach('archivo', Buffer.from('prueba'), 'Informe.TXT').expect(200);
        expect(subido.body).toMatchObject({ ticketId: 1, nombreArchivo: 'Informe.TXT', tamanio: 6, urlDescarga: '/api/adjuntos/1/descargar' });
        expect(subido.body).not.toHaveProperty('rutaArchivo');
        expect((await readdir(carpeta))[0]).toMatch(/^[a-f0-9-]{36}\.txt$/);
        expect((await http('get', '/api/adjuntos/ticket/1', rol, usuarioId).expect(200)).body).toHaveLength(1);
        const descarga = await http('get', '/api/adjuntos/1/descargar', rol, usuarioId).expect(200);
        expect(descarga.text).toBe('prueba');
        expect(descarga.headers['content-disposition']).toContain('Informe.TXT');
        expect(descarga.headers['x-content-type-options']).toBe('nosniff');
    });
    it('subida ajena -> 403, ticket inexistente -> 404, sin archivos persistidos', async () => {
        await http('post', '/api/adjuntos/ticket/2', 'SUPERVISOR').attach('archivo', Buffer.from('prueba'), 'a.txt').expect(403);
        await http('post', '/api/adjuntos/ticket/999').attach('archivo', Buffer.from('prueba'), 'a.txt').expect(404);
        expect(f.adjuntosRepo.create).not.toHaveBeenCalled();
        expect(await readdir(temporal)).toEqual([]);
    });
    it('CLIENTE ajeno y AGENTE no asignado no pueden subir archivos', async () => {
        await http('post', '/api/adjuntos/ticket/2', 'CLIENTE', 10).attach('archivo', Buffer.from('prueba'), 'a.txt').expect(403);
        f.tickets.ticket.agenteAsignadoId = null;
        await http('post', '/api/adjuntos/ticket/1', 'AGENTE', 20).attach('archivo', Buffer.from('prueba'), 'a.txt').expect(403);
        expect(f.adjuntosRepo.create).not.toHaveBeenCalled();
    });
    it('descarga ajena valida acceso antes de buscar archivo fisico', async () => {
        const row = await archivoFisico(2);
        await http('get', `/api/adjuntos/${row.id}/descargar`, 'SUPERVISOR').expect(403);
        await http('get', `/api/adjuntos/${row.id}/descargar`, 'CLIENTE', 10).expect(403);
    });
    it('adjunto inexistente o archivo fisico faltante -> 404', async () => {
        await http('get', '/api/adjuntos/999/descargar').expect(404);
        const row = await archivoFisico();
        await rm(row.rutaArchivo);
        await http('get', `/api/adjuntos/${row.id}/descargar`).expect(404);
    });
    it('bloquea ruta absoluta fuera de almacenamiento y traversal guardado en BD', async () => {
        const row = await archivoFisico();
        row.rutaArchivo = join(temporal, 'externo.txt') as typeof row.rutaArchivo;
        await writeFile(row.rutaArchivo, 'externo');
        const respuesta = await http('get', `/api/adjuntos/${row.id}/descargar`).expect(403);
        expect(JSON.stringify(respuesta.body)).not.toContain(temporal);
        row.rutaArchivo = join(carpeta, '..', 'externo.txt') as typeof row.rutaArchivo;
        await http('get', `/api/adjuntos/${row.id}/descargar`).expect(403);
    });
    it('bloquea escape mediante enlace o junction de directorio', async () => {
        const row = await archivoFisico();
        const fuera = join(temporal, 'fuera');
        await mkdir(fuera);
        await writeFile(join(fuera, 'privado.txt'), 'privado');
        await symlink(fuera, join(carpeta, 'enlace'), 'junction');
        row.rutaArchivo = join(carpeta, 'enlace', 'privado.txt') as typeof row.rutaArchivo;
        await http('get', `/api/adjuntos/${row.id}/descargar`).expect(403);
    });
    it('sanea nombres con rutas de navegador y no escribe usando nombre original', async () => {
        const row = await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), 'C:\\Usuarios\\documento.txt').expect(200);
        expect(row.body.nombreArchivo).toBe('documento.txt');
        const traversal = await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), '../../archivo.txt').expect(200);
        expect(traversal.body.nombreArchivo).toBe('archivo.txt');
        expect(await readdir(temporal)).toEqual(['adjuntos']);
    });
    it('rechaza archivo vacio, extension ejecutable, extension doble y campo incorrecto', async () => {
        await http('post', '/api/adjuntos/ticket/1').expect(400);
        await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.alloc(0), 'vacio.txt').expect(400);
        await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), 'malicioso.exe').expect(400);
        await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), 'documento.pdf.exe').expect(400);
        await http('post', '/api/adjuntos/ticket/1').attach('otro', Buffer.from('prueba'), 'a.txt').expect(400);
    });
    it('rechaza archivo mayor de 10 MB sin escribir', async () => {
        await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.alloc(TAMANIO_MAXIMO + 1), 'grande.txt').expect(413);
        expect(f.adjuntosRepo.create).not.toHaveBeenCalled();
    });
    it('fallo de persistencia limpia el archivo UUID y oculta rutas internas', async () => {
        f.adjuntosRepo.create.mockRejectedValueOnce(new Error(`Error en ${temporal}`));
        const res = await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), 'a.txt').expect(500);
        expect(await readdir(carpeta)).toEqual([]);
        expect(JSON.stringify(res.body)).not.toContain(temporal);
    });
    it('tipo faltante descarga con application/octet-stream y nombre unicode seguro', async () => {
        const row = await archivoFisico(1, 'informe.txt');
        row.tipoArchivo = null;
        row.nombreArchivo = 'Informe ñ.txt' as typeof row.nombreArchivo;
        const res = await http('get', `/api/adjuntos/${row.id}/descargar`).expect(200);
        expect(res.headers['content-type']).toContain('application/octet-stream');
        expect(res.headers['content-disposition']).toContain('Informe%20%C3%B1.txt');
    });
    it('subida multipart conserva nombre UTF-8 y descarga con nombre codificado', async () => {
        const subido = await http('post', '/api/adjuntos/ticket/1').attach('archivo', Buffer.from('prueba'), 'Información ñ.txt').expect(200);
        expect(subido.body.nombreArchivo).toBe('Información ñ.txt');
        const res = await http('get', subido.body.urlDescarga).expect(200);
        expect(res.headers['content-disposition']).toContain('Informaci%C3%B3n%20%C3%B1.txt');
    });
    it('ninguna respuesta contiene contrasenas, usuarios completos ni rutas internas', async () => {
        await archivoFisico();
        for (const path of ['/api/comentarios', '/api/comentarios/ticket/1', '/api/historial-tickets', '/api/historial-tickets/ticket/1', '/api/adjuntos/ticket/1']) {
            const res = await http('get', path).expect(200);
            const json = JSON.stringify(res.body);
            expect(json).not.toContain('password');
            expect(json).not.toContain('dato-sintetico-no-publico');
            expect(json).not.toContain('rutaArchivo');
            expect(json).not.toContain(temporal);
        }
    });
    it.each(['comentarios', 'historial-tickets', 'adjuntos'])('%s rechaza id malformado y rol desconocido', async (modulo) => {
        await http('get', `/api/${modulo}/ticket/abc`).expect(400);
        await http('get', `/api/${modulo}/ticket/1`, 'OTRO').expect(403);
    });
    it.each(['/api/comentarios', '/api/historial-tickets'])('JWT sin usuarioId no autoriza listados vacios: %s', async (path) => {
        f.comentarios.length = 0;
        f.historial.length = 0;
        await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${jwt.sign({ rol: 'ADMIN' })}`).expect(401);
    });
});
