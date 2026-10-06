import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { AppModule } from '../src/app.module.js';
import { EnlacesCompartidosRepository } from '../src/enlaces-compartidos/enlaces-compartidos.repository.js';
import type { Enlace, EnlaceNuevo } from '../src/enlaces-compartidos/enlaces-compartidos.repository.js';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import { AccesoProyectoService } from '../src/security/acceso-proyecto.service.js';
import { NotificacionService } from '../src/notificaciones/notificacion.service.js';
import { ticketsFixture } from './tickets-fixture.js';

describe('Enlaces compartidos HTTP', () => {
    let app: INestApplication;
    let jwt: JwtService;
    let f: ReturnType<typeof ticketsFixture>;
    let enlaces: Enlace[];
    let rolPersistido: string;
    const correo = { notificarEnlaceCompartido: vi.fn() };
    const repo = {
        usuario: vi.fn(), rol: vi.fn(), porId: vi.fn(), porToken: vi.fn(), listar: vi.fn(), crear: vi.fn(), revocar: vi.fn(),
    };
    beforeEach(async () => {
        vi.clearAllMocks();
        f = ticketsFixture(); enlaces = []; rolPersistido = 'ADMIN';
        repo.usuario.mockImplementation((email: string) => email === 'admin@example.test' ? { id: 30, nombre: 'Admin', apellido: 'Prueba' } : null);
        repo.rol.mockImplementation(async () => ({ rol: { nombre: rolPersistido } }));
        repo.porId.mockImplementation(async (id: bigint) => enlaces.find((e) => e.id === id) ?? null);
        repo.porToken.mockImplementation(async (token: string) => enlaces.find((e) => e.token === token) ?? null);
        repo.listar.mockImplementation(async (id: number) => enlaces.filter((e) => e.ticketId === id).toReversed());
        repo.crear.mockImplementation(async (data: EnlaceNuevo) => { const e = { ...data, id: BigInt(enlaces.length + 1) } as Enlace; enlaces.push(e); return e; });
        repo.revocar.mockImplementation(async (id: bigint) => { enlaces.find((e) => e.id === id)!.activo = false; });
        correo.notificarEnlaceCompartido.mockResolvedValue(true);
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(EnlacesCompartidosRepository).useValue(repo)
            .overrideProvider(TicketsRepository).useValue(f.repo)
            .overrideProvider(AccesoProyectoService).useValue({ validarAccesoProyecto: vi.fn(async (_u, id: number) => {
                if (id !== 1) { const { ForbiddenException } = await import('@nestjs/common'); throw new ForbiddenException(); }
            }) })
            .overrideProvider(NotificacionService).useValue(correo).compile();
        app = mod.createNestApplication({ logger: false }); await app.init(); jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    const auth = (rol = 'ADMIN') => `Bearer ${jwt.sign({ sub: 'admin@example.test', usuarioId: 30, rol })}`;
    const crear = (body: object = { correoDestinatario: 'externo@example.test' }, rol = 'ADMIN', id = 1) => request(app.getHttpServer()).post(`/api/tickets/${id}/compartir`).set('Authorization', auth(rol)).send(body);
    const leer = (token: string) => request(app.getHttpServer()).get(`/api/public/compartidos/${encodeURIComponent(token)}`);
    it('POST sin token 401', async () => { await request(app.getHttpServer()).post('/api/tickets/1/compartir').send({}).expect(401); });
    it.each(['/api/tickets/1/enlaces-compartidos', '/api/tickets/enlaces-compartidos/1'])('protegido sin token %s', async (ruta) => {
        const req = request(app.getHttpServer()); await (ruta.endsWith('/1') ? req.delete(ruta) : req.get(ruta)).expect(401);
    });
    it.each(['AGENTE', 'CLIENTE', 'OTRO'])('%s no puede gestionar enlaces', async (rol) => {
        await crear(undefined, rol).expect(403);
        await request(app.getHttpServer()).get('/api/tickets/1/enlaces-compartidos').set('Authorization', auth(rol)).expect(403);
        await request(app.getHttpServer()).delete('/api/tickets/enlaces-compartidos/1').set('Authorization', auth(rol)).expect(403);
    });
    it('defensa con rol persistido aunque JWT declare ADMIN', async () => { rolPersistido = 'AGENTE'; await crear().expect(403); expect(enlaces).toHaveLength(0); });
    it('SUPERVISOR crea para proyecto permitido', async () => { rolPersistido = 'SUPERVISOR'; await crear(undefined, 'SUPERVISOR').expect(201); });
    it('SUPERVISOR no crea/lista/revoca proyecto ajeno', async () => {
        const res = await crear().expect(201); f.ticket.proyectoId = 2; rolPersistido = 'SUPERVISOR';
        await crear(undefined, 'SUPERVISOR').expect(403);
        await request(app.getHttpServer()).get('/api/tickets/1/enlaces-compartidos').set('Authorization', auth('SUPERVISOR')).expect(403);
        await request(app.getHttpServer()).delete(`/api/tickets/enlaces-compartidos/${res.body.id}`).set('Authorization', auth('SUPERVISOR')).expect(403);
        expect(enlaces[0]!.activo).toBe(true);
    });
    it('crea UUID doble seguro y consulta pública sin JWT sin datos sensibles', async () => {
        const res = await crear({ correoDestinatario: 'EXTERNO@example.test', puedeComentar: true, puedeVerAdjuntos: true, puedeSubirAdjuntos: true, puedeCambiarEstado: true, puedeVer: false }).expect(201);
        expect(res.body.token).toMatch(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
        expect(res.body).toMatchObject({ correoDestinatario: 'externo@example.test', puedeVer: true, puedeComentar: false, puedeVerAdjuntos: false });
        const pub = await leer(res.body.token).expect(200);
        expect(Object.keys(pub.body).sort()).toEqual(['ticketId', 'numeroTicket', 'titulo', 'descripcion', 'estado', 'prioridad', 'categoria', 'nombreCliente', 'nombreAgente', 'puedeVer', 'puedeComentar', 'puedeVerAdjuntos', 'puedeSubirAdjuntos', 'puedeCambiarEstado', 'fechaCreacion', 'fechaExpiracion'].sort());
        expect(JSON.stringify(pub.body)).not.toMatch(/correo|password|hash|token|ruta/i);
        expect(pub.body.nombreAgente).toBe('Sin asignar'); expect(correo.notificarEnlaceCompartido).toHaveBeenCalledOnce();
        expect(f.historial).toHaveLength(0); expect(f.repo.update).not.toHaveBeenCalled();
    });
    it('enlace legado sigue sin permisos públicos adicionales', async () => {
        const res = await crear().expect(201); Object.assign(enlaces[0]!, { puedeComentar: true, puedeVerAdjuntos: true, puedeSubirAdjuntos: true, puedeCambiarEstado: true });
        expect((await leer(res.body.token).expect(200)).body).toMatchObject({ puedeComentar: false, puedeVerAdjuntos: false, puedeSubirAdjuntos: false, puedeCambiarEstado: false });
        await request(app.getHttpServer()).get(`/api/public/compartidos/${res.body.token}/adjuntos`).expect(404);
    });
    it('token inválido 404 y vacío 400', async () => { await leer('desconocido').expect(404); await leer(' ').expect(400); await leer('x'.repeat(151)).expect(404); });
    it('ticket inexistente 404', async () => { await crear(undefined, 'ADMIN', 999).expect(404); });
    it('enlace inexistente 404', async () => { await request(app.getHttpServer()).delete('/api/tickets/enlaces-compartidos/999').set('Authorization', auth()).expect(404); });
    it('vencido 403', async () => { const res = await crear().expect(201); enlaces[0]!.fechaExpiracion = Temporal.Now.plainDateTimeISO().subtract({ seconds: 1 }); await leer(res.body.token).expect(403); });
    it('revocar idempotente conserva registro y bloquea acceso 403', async () => {
        const res = await crear().expect(201);
        for (let i = 0; i < 2; i++) await request(app.getHttpServer()).delete(`/api/tickets/enlaces-compartidos/${res.body.id}`).set('Authorization', auth()).expect(200);
        expect(repo.revocar).toHaveBeenCalledOnce(); expect(enlaces).toHaveLength(1); await leer(res.body.token).expect(403);
    });
    it('regenerar crea otro token sin invalidar anterior; lista descendente', async () => {
        const uno = await crear().expect(201); const dos = await crear().expect(201); expect(uno.body.token).not.toBe(dos.body.token);
        await leer(uno.body.token).expect(200); await leer(dos.body.token).expect(200);
        const lista = await request(app.getHttpServer()).get('/api/tickets/1/enlaces-compartidos').set('Authorization', auth()).expect(200);
        expect(lista.body.map((e: { id: number }) => e.id)).toEqual([2, 1]);
    });
    it.each(['proyecto', 'compania', 'ticket', 'permiso'])('no disponible %s 403', async (caso) => {
        const res = await crear().expect(201);
        if (caso === 'proyecto') f.proyecto.estado = false;
        if (caso === 'compania') f.proyecto.compania.estado = false;
        if (caso === 'ticket') f.repo.findOne.mockResolvedValue(null);
        if (caso === 'permiso') enlaces[0]!.puedeVer = false;
        await leer(res.body.token).expect(403);
    });
    it('enlace legado sin vencimiento válido', async () => { const res = await crear().expect(201); enlaces[0]!.fechaExpiracion = null; expect((await leer(res.body.token).expect(200)).body.fechaExpiracion).toBeNull(); });
    it.each([{ correoDestinatario: 'inválido' }, { correoDestinatario: 'externo@example.test', fechaExpiracion: '2020-01-01T00:00' }, {}])('creación inválida %j 400', async (body) => { await crear(body).expect(400); expect(enlaces).toHaveLength(0); });
    it('SMTP falla sin romper creación', async () => { correo.notificarEnlaceCompartido.mockRejectedValue(new Error('SMTP')); const res = await crear().expect(201); await leer(res.body.token).expect(200); });
    it('ids Long grandes se serializan sin pérdida', async () => {
        await crear().expect(201); enlaces[0]!.id = 9223372036854775807n;
        const res = await request(app.getHttpServer()).get('/api/tickets/1/enlaces-compartidos').set('Authorization', auth()).expect(200);
        expect(res.body[0].id).toBe('9223372036854775807');
        await request(app.getHttpServer()).delete('/api/tickets/enlaces-compartidos/9223372036854775807').set('Authorization', auth()).expect(200);
    });
});
