// Read-only smoke validation of real Prisma queries and HTTP DTOs. Never uploads,
// comments, initializes configuration or sends email. Run after npm run build.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { db } from '../dist/prisma/db.js';
import { AppModule } from '../dist/app.module.js';

process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.MAIL_USERNAME = '';
process.env.MAIL_PASSWORD = '';
const originalOrm = db.orm;
const rollback = new Error('ACTIVIDAD_READ_ONLY_ROLLBACK');
let app;
let stage = 'conexion';
const checks = [];
try {
    try {
        await db.transaction(async (tx) => {
            await tx.execute(db.raw.sql`SET TRANSACTION READ ONLY`.affectedCount().build());
            await tx.execute(db.raw.sql`SET LOCAL statement_timeout = '15s'`.affectedCount().build());
            db.orm = tx.orm;
            const config = await tx.orm.public.ConfiguracionSistema.first();
            assert.ok(config, 'No se inicializa configuracion durante una validacion READ ONLY');
            const admin = (await tx.orm.public.UsuarioRoles.include('rol').all()).find((r) => r.rol.nombre === 'ADMIN');
            assert.ok(admin);
            const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
            app = mod.createNestApplication({ logger: false });
            await app.init();
            const jwt = app.get(JwtService);
            const token = jwt.sign({ usuarioId: admin.usuarioId, rol: 'ADMIN' });
            const get = (path) => request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
            stage = 'comentarios_globales';
            const comentarios = await get('/api/comentarios').expect(200);
            checks.push({ prueba: stage, resultado: 'OK', cantidad: comentarios.body.length });
            stage = 'historial_global';
            const historial = await get('/api/historial-tickets').expect(config.historialActivo ? 200 : 403);
            checks.push({ prueba: stage, resultado: 'OK', habilitado: config.historialActivo });
            const ticket = await tx.orm.public.Tickets.first();
            assert.ok(ticket);
            for (const modulo of ['comentarios', 'historial-tickets', 'adjuntos']) {
                stage = `${modulo}_por_ticket`;
                const res = await get(`/api/${modulo}/ticket/${ticket.id}`).expect(modulo === 'historial-tickets' && !config.historialActivo ? 403 : 200);
                const json = JSON.stringify(res.body);
                assert.ok(!json.includes('"password"'));
                assert.ok(!json.includes('"rutaArchivo"'));
                if (res.status === 200) assert.ok(res.body.every((r) => r.ticketId === ticket.id));
                checks.push({ prueba: stage, resultado: 'OK', cantidad: res.status === 200 ? res.body.length : undefined });
            }
            assert.ok(!JSON.stringify(comentarios.body).includes('"password"'));
            assert.ok(!JSON.stringify(historial.body).includes('"password"'));
            throw rollback;
        });
    } catch (error) { if (error !== rollback) throw error; }
    console.log(JSON.stringify({ resultado: 'OK', transaccion: 'READ ONLY y rollback', escrituras: 0, correos: 0, pruebas: checks }, null, 2));
} catch (error) {
    // Do not print driver errors/stacks: they can include connection strings.
    console.error(JSON.stringify({ resultado: 'ERROR', etapa: stage, tipo: error?.name, pruebas: checks }));
    process.exitCode = 1;
} finally {
    if (app) await app.close();
    db.orm = originalOrm;
    await db.close();
}
