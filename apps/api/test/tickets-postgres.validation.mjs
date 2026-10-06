// Manual validation against the configured database. No fixtures, inserts or migrations.
// All service reads (including lazy SLA initialization) run in one transaction,
// which MUST end by throwing the rollback sentinel below.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { db } from '../dist/prisma/db.js';
import { TicketsRepository } from '../dist/tickets/tickets.repository.js';
import { AccesoProyectoService } from '../dist/security/acceso-proyecto.service.js';

// The local HTTP app uses an ephemeral key; existing credentials are never printed.
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const { TicketsModule } = await import('../dist/tickets/tickets.module.js');
const rollback = new Error('TICKETS_VALIDATION_ROLLBACK');
const originalOrm = db.orm;
const results = [];
let fingerprintBefore;
let app;
let stage = 'conexion';
const fingerprint = (rows) => createHash('sha256')
    .update(JSON.stringify([...rows].sort((a, b) => a.id - b.id))).digest('hex');
const collect = async (query) => {
    const rows = [];
    for await (const row of await query) rows.push(row);
    return rows;
};

try {
    try {
        await db.transaction(async (tx) => {
            await tx.execute(db.raw.sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`.affectedCount().build());
            await tx.execute(db.raw.sql`SET LOCAL statement_timeout = '30s'`.affectedCount().build());
            await tx.execute(db.raw.sql`SET LOCAL lock_timeout = '5s'`.affectedCount().build());
            // Bind BOTH the repository and the actual AccesoProyectoService to tx.
            db.orm = tx.orm;
            assert.equal(db.orm, tx.orm);
            const repo = new TicketsRepository();
            const acceso = new AccesoProyectoService();
            stage = 'lectura_tickets';
            const originales = await tx.orm.public.Tickets.all();
            fingerprintBefore = fingerprint(originales);
            const tickets = await repo.findAll(null, 1, 'ADMIN');
            assert.ok(tickets.length > 0, 'No hay tickets reales para validar');
            assert.equal(tickets.length, originales.length);
            results.push({ prueba: 'listar_tickets_reales', resultado: 'OK', cantidad: tickets.length });
            const conAgente = tickets.find((t) => t.agenteAsignadoId !== null);
            const muestra = conAgente ?? tickets[0];
            const detalle = await repo.findOne(muestra.id);
            assert.ok(detalle);
            assert.equal(detalle.numeroTicket, muestra.numeroTicket);
            assert.equal(detalle.proyecto.id, detalle.proyectoId);
            assert.equal(detalle.cliente.id, detalle.clienteId);
            assert.equal(detalle.tipoIncidencia.id, detalle.tipoIncidenciaId);
            assert.equal((await repo.findProyecto(detalle.proyectoId)).id, detalle.proyectoId);
            assert.equal((await repo.findUsuario(detalle.clienteId)).id, detalle.clienteId);
            assert.equal((await repo.findTipo(detalle.tipoIncidenciaId)).id, detalle.tipoIncidenciaId);
            assert.ok(detalle.prioridad && detalle.estado && detalle.numeroTicket);
            if (conAgente) {
                assert.equal(detalle.agenteAsignado.id, detalle.agenteAsignadoId);
                assert.equal((await repo.findUsuario(detalle.agenteAsignadoId)).id, detalle.agenteAsignadoId);
            }
            results.push({ prueba: 'detalle_y_relaciones_reales', resultado: 'OK',
                agente: conAgente ? 'verificado' : 'sin_agentes_asignados_en_la_base',
                numeroTicket: detalle.numeroTicket, estado: detalle.estado, prioridad: detalle.prioridad });

            stage = 'numeracion';
            const anio = new Date().getFullYear();
            const prefijo = `INC-${anio}-`;
            const countRows = await collect(tx.query(db.raw.sql`SELECT count(*)::integer AS cantidad FROM tickets WHERE numero_ticket LIKE ${`${prefijo}%`}`
                .returnsRow({ cantidad: 'pg/int4@1' }).build()));
            const cantidad = countRows[0].cantidad;
            const esperado = `${prefijo}${String(cantidad + 1).padStart(4, '0')}`;
            assert.equal(await repo.numeroTicket(anio), esperado);
            results.push({ prueba: 'numeroTicket_vs_count_SQL_Spring_Boot', resultado: 'OK', cantidadAnual: cantidad,
                siguiente: esperado, coincideConExistente: tickets.some((t) => t.numeroTicket === esperado) });

            stage = 'http_y_permisos';
            const mod = await Test.createTestingModule({ imports: [TicketsModule] })
                .overrideProvider(TicketsRepository).useValue(repo).compile();
            app = mod.createNestApplication({ logger: false });
            await app.init();
            const jwt = app.get(JwtService);
            const get = (path, usuarioId, rol) => request(app.getHttpServer()).get(path)
                .set('Authorization', `Bearer ${jwt.sign({ usuarioId, rol })}`);
            const roles = await tx.orm.public.UsuarioRoles.include('rol').all();
            const adminId = roles.find((r) => r.rol.nombre === 'ADMIN')?.usuarioId;
            assert.ok(adminId, 'No hay ADMIN real para validar');
            const listado = await get('/api/tickets', adminId, 'ADMIN').expect(200);
            assert.equal(listado.body.length, tickets.length);
            const respuesta = await get(`/api/tickets/${detalle.id}`, adminId, 'ADMIN').expect(200);
            assert.equal(respuesta.body.numeroTicket, detalle.numeroTicket);
            assert.equal(respuesta.body.proyectoId, detalle.proyectoId);
            assert.equal(respuesta.body.clienteId, detalle.clienteId);
            assert.equal(respuesta.body.agenteId, detalle.agenteAsignadoId);
            assert.equal(respuesta.body.tipoIncidenciaId, detalle.tipoIncidenciaId);
            assert.equal(respuesta.body.prioridad, detalle.prioridad);
            assert.equal(respuesta.body.estado, detalle.estado);
            results.push({ prueba: 'GET_listado_y_detalle_HTTP_ADMIN_real', resultado: 'OK' });
            const asignaciones = await tx.orm.public.UsuarioProyectos.all();
            const proyectos = await tx.orm.public.Proyectos.include('compania').all();
            for (const rol of ['SUPERVISOR', 'AGENTE', 'CLIENTE']) {
                const usuarios = roles.filter((r) => r.rol.nombre === rol).slice(0, 3);
                assert.ok(usuarios.length, `No hay usuarios reales de rol ${rol}`);
                let accesos = 0;
                let rechazos = 0;
                for (const { usuarioId } of usuarios) {
                    const usuario = { usuarioId, rol };
                    const idsEsperados = [...new Set(asignaciones.filter((a) => a.usuarioId === usuarioId && a.estado === true &&
                        proyectos.some((p) => p.id === a.proyectoId && p.estado === true && p.compania?.estado === true))
                        .map((a) => a.proyectoId))];
                    const ids = await acceso.obtenerIdsPermitidos(usuario);
                    assert.deepEqual([...new Set(ids)].sort(), idsEsperados.sort());
                    for (const id of ids) {
                        await acceso.validarAccesoProyecto(usuario, id);
                        accesos++;
                    }
                    const ajeno = proyectos.find((p) => !ids.includes(p.id))?.id ?? 2147483647;
                    await assert.rejects(acceso.validarAccesoProyecto(usuario, ajeno), (e) => e.getStatus() === 403);
                    rechazos++;
                    const esperados = tickets.filter((t) => ids.includes(t.proyectoId) &&
                        (rol !== 'CLIENTE' || t.clienteId === usuarioId) &&
                        (rol !== 'AGENTE' || t.agenteAsignadoId === usuarioId));
                    const lista = await get('/api/tickets', usuarioId, rol).expect(200);
                    assert.deepEqual(lista.body.map((t) => t.id).sort((a, b) => a - b), esperados.map((t) => t.id).sort((a, b) => a - b));
                    const permitido = rol === 'CLIENTE' ? tickets.find((t) => t.clienteId === usuarioId) : esperados[0];
                    if (permitido) { await get(`/api/tickets/${permitido.id}`, usuarioId, rol).expect(200); accesos++; }
                    const denegado = tickets.find((t) => rol === 'CLIENTE' ? t.clienteId !== usuarioId :
                        !ids.includes(t.proyectoId) || (rol === 'AGENTE' && t.agenteAsignadoId !== usuarioId));
                    if (denegado) { await get(`/api/tickets/${denegado.id}`, usuarioId, rol).expect(403); rechazos++; }
                }
                results.push({ prueba: `permisos_reales_${rol}`, resultado: 'OK', usuarios: usuarios.length, accesos, rechazos });
            }
            await request(app.getHttpServer()).get('/api/tickets').expect(401);
            results.push({ prueba: 'HTTP_sin_JWT', resultado: 'OK' });
            throw rollback;
        });
        throw new Error('La validacion no debe confirmar la transaccion');
    } catch (error) {
        if (error !== rollback) throw error;
        results.push({ prueba: 'rollback_obligatorio', resultado: 'OK' });
    } finally {
        db.orm = originalOrm;
        if (app) await app.close();
    }
    stage = 'verificacion_datos_sin_cambios';
    assert.equal(fingerprint(await db.orm.public.Tickets.all()), fingerprintBefore);
    results.push({ prueba: 'tickets_identicos_despues_del_rollback', resultado: 'OK' });
    console.log(JSON.stringify({ resultado: 'OK', pruebas: results }, null, 2));
} catch (error) {
    // Error messages/stack can contain connection strings or bound user data.
    console.error(JSON.stringify({ resultado: 'ERROR', etapa: stage, tipo: error?.name,
        codigo: /^[A-Z0-9_.-]+$/.test(String(error?.code ?? '')) ? error.code : undefined,
        pruebasCompletadas: results }, null, 2));
    process.exitCode = 1;
} finally {
    db.orm = originalOrm;
    await db.close();
}
