import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ReportesRepository } from '../src/reportes/reportes.repository.js';
import { ConfiguracionSistemaService } from '../src/configuracion/configuracion-sistema.service.js';
import { db } from '../src/prisma/db.js';
import { reportesFixture } from './reportes-fixture.js';

describe('Reportes HTTP y Dashboard', () => {
    let app: INestApplication;
    let jwt: JwtService;
    let f: ReturnType<typeof reportesFixture>;
    const rutas = ['resumen', 'dashboard-resumen', 'tickets-por-estado', 'tickets-por-prioridad', 'tickets-por-tipo', 'operacion-resumen', 'recursos-resumen'];
    beforeEach(async () => {
        f = reportesFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: f.tickets.UsuarioProyectos() });
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ReportesRepository).useValue(f.repo)
            .overrideProvider(ConfiguracionSistemaService).useValue(f.configService).compile();
        app = mod.createNestApplication({ logger: false });
        await app.init();
        jwt = app.get(JwtService);
    });
    afterEach(async () => { await app?.close(); });
    function get(ruta: string, rol = 'ADMIN', id = 40) {
        return request(app.getHttpServer()).get(`/api/reportes/${ruta}`).set('Authorization', `Bearer ${jwt.sign({ sub: `u${id}@example.test`, usuarioId: id, rol })}`);
    }
    it.each(rutas)('sin token %s -> 401', async (ruta) => { await request(app.getHttpServer()).get(`/api/reportes/${ruta}`).expect(401); });
    it.each(rutas)('rol desconocido %s -> 403', async (ruta) => { await get(ruta, 'OTRO').expect(403); });
    it('ADMIN resumen global exacto', async () => {
        const res = await get('resumen').expect(200);
        expect(res.body).toEqual({ totalTickets: 14, ticketsNuevos: 8, ticketsAsignados: 1, ticketsEnProgreso: 1,
            ticketsResueltos: 1, ticketsCerrados: 3, totalUsuarios: 12, totalComentarios: 5 });
        expect(f.repo.totalUsuarios).toHaveBeenCalledOnce();
    });
    it('SUPERVISOR solo sus proyectos y usuarios relacionados', async () => {
        const res = await get('resumen', 'SUPERVISOR', 30).expect(200);
        expect(res.body).toMatchObject({ totalTickets: 13, ticketsCerrados: 2, totalUsuarios: 5, totalComentarios: 4 });
        expect(f.repo.totalUsuarios).not.toHaveBeenCalled();
    });
    it('AGENTE solo asignados dentro de proyectos activos', async () => {
        const res = await get('resumen', 'AGENTE', 20).expect(200);
        expect(res.body).toMatchObject({ totalTickets: 11, totalUsuarios: 3, totalComentarios: 4 });
    });
    it('CLIENTE solo propios en proyectos activos, excluye comentarios INTERNO', async () => {
        const res = await get('resumen', 'CLIENTE', 10).expect(200);
        expect(res.body).toMatchObject({ totalTickets: 10, totalUsuarios: 2, totalComentarios: 3 });
    });
    it.each(rutas.filter((r) => r !== 'dashboard-resumen'))('proyecto no permitido %s -> 403', async (ruta) => {
        await get(`${ruta}?proyectoId=2`, 'SUPERVISOR', 30).expect(403);
        expect(f.repo.findTickets).not.toHaveBeenCalled();
    });
    it('ADMIN filtra proyecto/compañia juntos, sus usuarios pasan a relacionados', async () => {
        const porProyecto = await get('resumen?proyectoId=1').expect(200);
        expect(porProyecto.body).toMatchObject({ totalTickets: 13, totalUsuarios: 5, totalComentarios: 4 });
        const porCompania = await get('resumen?companiaId=2').expect(200);
        expect(porCompania.body).toMatchObject({ totalTickets: 1, totalUsuarios: 3, totalComentarios: 1 });
        const incompatibles = await get('resumen?proyectoId=1&companiaId=2').expect(200);
        expect(incompatibles.body).toMatchObject({ totalTickets: 0, totalUsuarios: 1, totalComentarios: 0 });
    });
    it('conteos por estado correctos, orden estable y estados historicos separados', async () => {
        const res = await get('tickets-por-estado').expect(200);
        expect(res.body).toEqual([{ nombre: 'NUEVO', total: 8 }, { nombre: 'ASIGNADO', total: 1 },
            { nombre: 'EN_PROGRESO', total: 1 }, { nombre: 'RESUELTO', total: 1 }, { nombre: 'CERRADO', total: 3 }]);
    });
    it('conteos por prioridad correctos', async () => {
        const res = await get('tickets-por-prioridad').expect(200);
        expect(res.body).toEqual([{ nombre: 'P1_CRITICA', total: 2 }, { nombre: 'P2_ALTA', total: 1 },
            { nombre: 'P3_MEDIA', total: 1 }, { nombre: 'P4_BAJA', total: 10 }]);
    });
    it('conteos por tipo correctos y agrupacion conserva nombres', async () => {
        const res = await get('tickets-por-tipo').expect(200);
        expect(res.body).toEqual([{ nombre: 'Hardware', total: 3 }, { nombre: 'Software', total: 3 }, { nombre: 'Recursos', total: 8 }]);
    });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('%s respeta alcance en todos los endpoints', async (rol) => {
        const id = rol === 'SUPERVISOR' ? 30 : rol === 'AGENTE' ? 20 : 10;
        const total = rol === 'SUPERVISOR' ? 13 : rol === 'AGENTE' ? 11 : 10;
        const resumen = await get('dashboard-resumen', rol, id).expect(200);
        expect(resumen.body.totalTickets).toBe(total);
        const tipos = await get('tickets-por-tipo', rol, id).expect(200);
        expect(tipos.body.reduce((n: number, c: { total: number }) => n + c.total, 0)).toBe(total);
        const prioridades = await get('tickets-por-prioridad', rol, id).expect(200);
        expect(prioridades.body.reduce((n: number, c: { total: number }) => n + c.total, 0)).toBe(total);
        const operacion = await get('operacion-resumen', rol, id).expect(200);
        expect(operacion.body.totalOperativos).toBe(total - 8);
        const recursos = await get('recursos-resumen', rol, id).expect(200);
        expect(recursos.body.totalSolicitudes).toBe(8);
    });
    it.each(['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'])('modulo deshabilitado bloquea %s y Dashboard sigue', async (rol) => {
        f.config.reportesActivos = false;
        const id = rol === 'ADMIN' ? 40 : rol === 'SUPERVISOR' ? 30 : rol === 'AGENTE' ? 20 : 10;
        for (const ruta of rutas.filter((r) => r !== 'dashboard-resumen')) await get(ruta, rol, id).expect(403);
        await get('dashboard-resumen', rol, id).expect(200);
    });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('flag %s bloquea reportes y no Dashboard', async (rol) => {
        Object.assign(f.config, { [`reportes${rol.charAt(0)}${rol.slice(1).toLowerCase()}`]: false });
        const id = rol === 'SUPERVISOR' ? 30 : rol === 'AGENTE' ? 20 : 10;
        await get('resumen', rol, id).expect(403);
        await get('dashboard-resumen', rol, id).expect(200);
    });
    it('Dashboard ignora configuracion y filtros; ADMIN ignora flag especifico', async () => {
        f.config.reportesAdmin = false;
        await get('resumen').expect(200);
        f.configService.obtenerOCrear.mockRejectedValueOnce(new Error('No consultar configuración')); 
        const res = await get('dashboard-resumen?proyectoId=999&companiaId=abc').expect(200);
        expect(res.body.totalTickets).toBe(14);
        expect(f.configService.obtenerOCrear).toHaveBeenCalledTimes(1);
    });
    it.each(['SUPERVISOR', 'AGENTE', 'CLIENTE'])('proyecto/compania inactivos excluyen %s y vacio no falla', async (rol) => {
        const id = rol === 'SUPERVISOR' ? 30 : rol === 'AGENTE' ? 20 : 10;
        f.tickets.proyecto.estado = false;
        let res = await get('resumen', rol, id).expect(200);
        expect(res.body).toMatchObject({ totalTickets: 0, totalUsuarios: 1, totalComentarios: 0 });
        f.tickets.proyecto.estado = true;
        f.tickets.proyecto.compania.estado = false;
        res = await get('resumen', rol, id).expect(200);
        expect(res.body.totalTickets).toBe(0);
    });
    it('asignacion inactiva elimina alcance; ADMIN conserva tickets de proyecto inactivo', async () => {
        f.tickets.asignaciones.forEach((a) => { a.estado = false; });
        Object.assign(db.orm.public, { UsuarioProyectos: f.tickets.UsuarioProyectos() });
        expect((await get('resumen', 'SUPERVISOR', 30).expect(200)).body.totalTickets).toBe(0);
        f.tickets.proyecto.estado = false;
        expect((await get('resumen').expect(200)).body.totalTickets).toBe(14);
    });
    it('datos vacios: resumen con ceros, estados/prioridades fijos, tipo vacio, recursos sin NaN', async () => {
        f.rows.length = 0;
        f.solicitudes.length = 0;
        const res = await get('resumen').expect(200);
        expect(res.body).toMatchObject({ totalTickets: 0, totalUsuarios: 12, totalComentarios: 0 });
        for (const ruta of ['tickets-por-estado', 'tickets-por-prioridad']) {
            const resultado = await get(ruta).expect(200);
            expect(resultado.body.every((c: { total: number }) => c.total === 0)).toBe(true);
        }
        expect((await get('tickets-por-tipo').expect(200)).body).toEqual([]);
        expect((await get('recursos-resumen').expect(200)).body).toMatchObject({ totalSolicitudes: 0, retrasadas: 0, proximasEntregas: 0, promedioDiasProveedor: 0 });
    });
    it('operacion separa externos y recursos devuelve contrato del frontend', async () => {
        const op = await get('operacion-resumen').expect(200);
        expect(op.body).toEqual({ totalOperativos: 6, ticketsNuevos: 1, ticketsAsignados: 1, ticketsEnProgreso: 1, ticketsResueltos: 1, ticketsCerrados: 2 });
        const rec = await get('recursos-resumen').expect(200);
        expect(rec.body).toEqual({ totalSolicitudes: 8, nuevas: 1, enValidacion: 1, solicitadasProveedor: 1, esperandoProveedor: 1,
            recibidas: 1, entregadas: 1, cerradas: 1, canceladas: 1, retrasadas: 1, proximasEntregas: 1, promedioDiasProveedor: 2.5 });
    });
    it.each(rutas)('%s no expone secretos ni escribe datos', async (ruta) => {
        const res = await get(ruta).expect(200);
        expect(res.text).not.toMatch(/password|correo|token|codigo|rutaArchivo|descripcion|numeroTicket|clienteNombre/i);
        expect(f.tickets.repo.update).not.toHaveBeenCalled();
        expect(f.tickets.repo.historial).not.toHaveBeenCalled();
        expect(f.tickets.repo.transaction).not.toHaveBeenCalled();
    });
    it('rol persistido determina alcance, no usuarioId manipulado del JWT', async () => {
        const res = await request(app.getHttpServer()).get('/api/reportes/resumen')
            .set('Authorization', `Bearer ${jwt.sign({ sub: 'u10@example.test', rol: 'ADMIN', usuarioId: 40 })}`).expect(200);
        expect(res.body.totalTickets).toBe(10);
        expect(f.repo.totalUsuarios).not.toHaveBeenCalled();
    });
    it('usuario inexistente, sin subject o sin rol no retorna metricas', async () => {
        await get('resumen', 'ADMIN', 999).expect(400);
        await request(app.getHttpServer()).get('/api/reportes/resumen').set('Authorization', `Bearer ${jwt.sign({ usuarioId: 40, rol: 'ADMIN' })}`).expect(400);
        f.repo.rol.mockResolvedValueOnce(null);
        await get('resumen').expect(400);
        f.repo.rol.mockResolvedValueOnce({ rol: { nombre: 'OTRO' } });
        await get('resumen').expect(403);
    });
    it.each(['abc', '-1', '0', '1.5', '2147483648', '1&proyectoId=2'])('filtro invalido %s -> 400', async (value) => {
        await get(`resumen?proyectoId=${value}`).expect(400);
    });
    it('identificador vacio se ignora y compañia ajena no filtra datos', async () => {
        expect((await get('resumen?proyectoId=').expect(200)).body.totalTickets).toBe(14);
        expect((await get('resumen?companiaId=2', 'SUPERVISOR', 30).expect(200)).body.totalTickets).toBe(0);
    });
});
