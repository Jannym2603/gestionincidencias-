import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import { ConfiguracionSistemaService } from '../src/configuracion/configuracion-sistema.service.js';
import { ticketsFixture } from './tickets-fixture.js';
import { db } from '../src/prisma/db.js';

describe('Arranque de la API con correo opcional', () => {
    afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
    it.each([false, true])('inicia con credenciales de correo presentes=%s sin enviar', async (configurado) => {
        vi.stubEnv('MAIL_USERNAME', configurado ? 'correo@example.test' : '');
        vi.stubEnv('MAIL_PASSWORD', configurado ? randomBytes(16).toString('hex') : '');
        const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
        const app = mod.createNestApplication({ logger: false });
        try {
            await app.init();
            if (configurado) {
                expect(nodemailer.createTransport).toHaveBeenCalledOnce();
                const transport = vi.mocked(nodemailer.createTransport).mock.results[0]!.value;
                expect(transport.sendMail).not.toHaveBeenCalled();
            } else expect(nodemailer.createTransport).not.toHaveBeenCalled();
        } finally { await app.close(); }
    });

    it('SMTP fallando no rompe creacion, asignacion ni cierre por HTTP', async () => {
        vi.stubEnv('MAIL_USERNAME', 'correo@example.test');
        vi.stubEnv('MAIL_PASSWORD', randomBytes(16).toString('hex'));
        const fixture = ticketsFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: fixture.UsuarioProyectos() });
        const mod = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(TicketsRepository).useValue(fixture.repo)
            .overrideProvider(ConfiguracionSistemaService).useValue({ obtenerOCrear: fixture.repo.configuracion }).compile();
        const app = mod.createNestApplication({ logger: false });
        try {
            await app.init();
            const transport = vi.mocked(nodemailer.createTransport).mock.results[0]!.value;
            vi.mocked(transport.sendMail).mockRejectedValue(new Error('SMTP simulado'));
            const token = app.get(JwtService).sign({ usuarioId: 30, rol: 'ADMIN' });
            const http = (method: 'post' | 'put', path: string) => request(app.getHttpServer())[method](path)
                .set('Authorization', `Bearer ${token}`);
            await http('post', '/api/tickets').send(fixture.crear).expect(201);
            await http('put', '/api/tickets/1/asignar').send({ agenteId: 20 }).expect(200);
            await http('put', '/api/tickets/1/estado').send({ estado: 'CERRADO', notaResolucion: 'Listo' }).expect(200);
            expect(fixture.rows).toHaveLength(2);
            expect(fixture.ticket.estado).toBe('CERRADO');
            expect(transport.sendMail).toHaveBeenCalledTimes(4);
            await http('put', '/api/tickets/1/prioridad').send({ prioridad: 'P1_CRITICA', usuarioId: 30 }).expect(200);
            expect(transport.sendMail).toHaveBeenCalledTimes(4);
        } finally { await app.close(); }
    });
});
