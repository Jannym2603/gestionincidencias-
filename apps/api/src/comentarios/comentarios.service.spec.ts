import { vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { ComentariosService } from './comentarios.service.js';
import { ComentariosRepository } from './comentarios.repository.js';
import { TicketsRepository } from '../tickets/tickets.repository.js';
import { AccesoTicketService } from '../tickets/acceso-ticket.service.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';
import { actividadFixture } from '../../test/actividad-ticket-fixture.js';
import { db } from '../prisma/db.js';

describe('Comentarios: SLA, atomicidad y correo', () => {
    let f: ReturnType<typeof actividadFixture>;
    let service: ComentariosService;
    const admin = { usuarioId: 30, rol: 'ADMIN' };
    beforeEach(() => {
        f = actividadFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: f.tickets.UsuarioProyectos() });
        const tickets = f.tickets.repo as unknown as TicketsRepository;
        service = new ComentariosService(f.comentariosRepo as unknown as ComentariosRepository, tickets,
            new AccesoTicketService(tickets, new AccesoProyectoService()), f.notificaciones as unknown as NotificacionService);
    });
    const body = { ticketId: 1, usuarioId: 30, contenido: 'Respuesta', tipoComentario: 'PUBLICO' };
    it('usa rol persistido para primera respuesta y nunca confia solo en rol del JWT', async () => {
        f.tickets.repo.findRol.mockResolvedValueOnce({ rol: { nombre: 'CLIENTE' } });
        await service.create(body, admin);
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBeNull();
        expect(f.tickets.historial).toHaveLength(1);
    });
    it('prioridad antigua desconocida usa respuesta de 8 horas', async () => {
        f.tickets.ticket.prioridad = 'ANTIGUA' as typeof f.tickets.ticket.prioridad;
        f.tickets.ticket.fechaCreacion = Temporal.PlainDateTime.from('2020-01-01T10:00');
        f.tickets.ticket.fechaLimiteRespuesta = null;
        await service.create(body, admin);
        expect(f.tickets.ticket.fechaLimiteRespuesta!.toString()).toBe('2020-01-01T18:00:00');
        expect(f.tickets.ticket.slaRespuestaCumplido).toBe(false);
    });
    it('los recursos externos tambien registran primera respuesta, sin cambiar su flujo', async () => {
        f.tickets.ticket.tipoAtencion = 'RECURSO_EXTERNO' as typeof f.tickets.ticket.tipoAtencion;
        await service.create(body, admin);
        expect(f.tickets.ticket.fechaPrimeraRespuesta).toBeTruthy();
        expect(f.tickets.ticket.estado).toBe('EN_PROGRESO');
        expect(f.tickets.repo.recurso).not.toHaveBeenCalled();
    });
    it('comentario sobre ticket cerrado conserva estado y fecha de cierre', async () => {
        f.tickets.ticket.estado = 'CERRADO' as typeof f.tickets.ticket.estado;
        const cierre = Temporal.Now.plainDateTimeISO();
        f.tickets.ticket.fechaCierre = cierre;
        await service.create(body, admin);
        expect(f.tickets.ticket.estado).toBe('CERRADO');
        expect(f.tickets.ticket.fechaCierre).toBe(cierre);
    });
    it('correo se ejecuta despues del commit y no existe si la transaccion falla', async () => {
        const original = f.tickets.repo.transaction.getMockImplementation()!;
        let confirmado = false;
        f.tickets.repo.transaction.mockImplementation(async (...args) => {
            const result = await original(...args);
            confirmado = true;
            return result;
        });
        f.notificaciones.notificarComentarioPublico.mockImplementation(async () => { expect(confirmado).toBe(true); return true; });
        await service.create(body, admin);
        expect(f.notificaciones.notificarComentarioPublico).toHaveBeenCalledOnce();
        f.notificaciones.notificarComentarioPublico.mockClear();
        f.tickets.repo.historial.mockRejectedValueOnce(new Error('fallo'));
        await expect(service.create(body, admin)).rejects.toThrow('fallo');
        expect(f.notificaciones.notificarComentarioPublico).not.toHaveBeenCalled();
    });
});
