import { vi } from 'vitest';
import { TicketsService } from './tickets.service.js';
import { TicketsRepository } from './tickets.repository.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import { ticketsFixture } from '../../test/tickets-fixture.js';
import { db } from '../prisma/db.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';

describe('Tickets: atomicidad y validaciones', () => {
    let f: ReturnType<typeof ticketsFixture>;
    let service: TicketsService;
    let notificaciones: { notificarTicketCreado: ReturnType<typeof vi.fn>; notificarTicketAsignado: ReturnType<typeof vi.fn>; notificarCambioEstado: ReturnType<typeof vi.fn> };
    const admin = { usuarioId: 30, rol: 'ADMIN' };
    beforeEach(() => {
        f = ticketsFixture();
        Object.assign(db.orm.public, { UsuarioProyectos: f.UsuarioProyectos() });
        notificaciones = { notificarTicketCreado: vi.fn(async () => true), notificarTicketAsignado: vi.fn(async () => true), notificarCambioEstado: vi.fn(async () => true) };
        service = new TicketsService(f.repo as unknown as TicketsRepository, new AccesoProyectoService(),
            { obtenerOCrear: f.repo.configuracion } as unknown as ConfiguracionSistemaService,
            notificaciones as unknown as NotificacionService);
    });
    it('revierte ticket y recurso cuando falla su historial', async () => {
        f.repo.historial.mockRejectedValueOnce(new Error('fallo persistencia'));
        await expect(service.create({ ...f.crear, tipoAtencion: 'RECURSO_EXTERNO',
            solicitudRecurso: { categoria: 'Equipo', recurso: 'Monitor', cantidad: 1 } }, admin)).rejects.toThrow('fallo persistencia');
        expect(f.rows).toHaveLength(1);
        expect(f.recursos).toHaveLength(0);
        expect(f.historial).toHaveLength(0);
        expect(notificaciones.notificarTicketCreado).not.toHaveBeenCalled();
    });
    it('revierte asignacion cuando falla historial', async () => {
        f.repo.historial.mockRejectedValueOnce(new Error('fallo persistencia'));
        await expect(service.asignar(1, { agenteId: 20 }, admin)).rejects.toThrow();
        expect(f.ticket.estado).toBe('NUEVO');
        expect(f.ticket.agenteAsignadoId).toBeNull();
        expect(notificaciones.notificarTicketAsignado).not.toHaveBeenCalled();
    });
    it('no registra primera respuesta al asignar', async () => {
        await service.asignar(1, { agenteId: 20 }, admin);
        expect(f.ticket.fechaPrimeraRespuesta).toBeNull();
        expect(f.historial.map((h) => h.accion)).toEqual(['ASIGNACION_AGENTE', 'CAMBIO_ESTADO']);
    });
    it('permite reasignacion de ticket ya asignado incluso cerrado como Spring Boot', async () => {
        f.ticket.agenteAsignadoId = 20;
        f.ticket.estado = 'CERRADO' as typeof f.ticket.estado;
        await service.asignar(1, { agenteId: 20 }, admin);
        expect(f.ticket.estado).toBe('CERRADO');
        expect(f.historial).toHaveLength(1);
    });
    it('requiere acceso del agente al proyecto aun para ADMIN', async () => {
        f.asignaciones.splice(1, 1);
        Object.assign(db.orm.public, { UsuarioProyectos: f.UsuarioProyectos() });
        await expect(service.asignar(1, { agenteId: 20 }, admin)).rejects.toThrow('El agente no tiene acceso');
        expect(f.repo.update).not.toHaveBeenCalled();
    });
    it('rechaza rol incorrecto de cliente o agente', async () => {
        f.repo.findRol.mockResolvedValue({ rol: { nombre: 'SUPERVISOR' } });
        await expect(service.create(f.crear, admin)).rejects.toThrow('rol CLIENTE');
        await expect(service.asignar(1, { agenteId: 20 }, admin)).rejects.toThrow('rol AGENTE');
    });
    it('requiere acceso del cliente al crear', async () => {
        f.asignaciones.splice(0, 1);
        Object.assign(db.orm.public, { UsuarioProyectos: f.UsuarioProyectos() });
        await expect(service.create(f.crear, admin)).rejects.toThrow('El cliente no tiene acceso');
    });
    it('recalcula cumplimiento historico al subir prioridad', async () => {
        f.ticket.fechaPrimeraRespuesta = f.ticket.fechaCreacion!.add({ hours: 1 });
        f.ticket.fechaResolucion = f.ticket.fechaCreacion!.add({ hours: 6 });
        await service.prioridad(1, { prioridad: 'P1_CRITICA', usuarioId: 30 }, admin);
        expect(f.ticket.slaRespuestaCumplido).toBe(false);
        expect(f.ticket.slaResolucionCumplido).toBe(false);
    });
    it('recurso externo mantiene SLA resolucion null al cambiar prioridad', async () => {
        f.ticket.tipoAtencion = 'RECURSO_EXTERNO' as typeof f.ticket.tipoAtencion;
        await service.prioridad(1, { prioridad: 'P2_ALTA', usuarioId: 30 }, admin);
        expect(f.ticket.fechaLimiteResolucion).toBeNull();
        expect(f.ticket.slaResolucionCumplido).toBeNull();
    });
    it('rechaza cierre repetido y nunca crea estados heredados', async () => {
        f.ticket.estado = 'CERRADO' as typeof f.ticket.estado;
        await expect(service.estado(1, { estado: 'CERRADO', notaResolucion: 'Nota' }, admin)).rejects.toThrow('Transicion');
    });
    it('requiere usuario verificable en detalle sin consultar proyectos del cliente', async () => {
        await expect(service.findOne(1, { rol: 'CLIENTE', usuarioId: NaN })).rejects.toThrow('identificar');
    });
    it('usa numeracion anual del repositorio existente', async () => {
        const result = await service.create(f.crear, admin);
        expect(f.repo.numeroTicket).toHaveBeenCalledWith(f.rows[1]!.fechaCreacion!.year);
        expect(result.numeroTicket).toMatch(/^INC-\d{4}-0002$/);
    });

    it('notifica creacion, asignacion y estado solo despues de confirmar la transaccion', async () => {
        const transaccion = f.repo.transaction.getMockImplementation()!;
        let confirmado = false;
        f.repo.transaction.mockImplementation(async (...args) => {
            confirmado = false;
            const resultado = await transaccion(...args);
            confirmado = true;
            return resultado;
        });
        for (const enviar of Object.values(notificaciones)) {
            enviar.mockImplementation(async () => { expect(confirmado).toBe(true); return true; });
        }
        await service.create(f.crear, admin);
        expect(notificaciones.notificarTicketCreado).toHaveBeenCalledWith(expect.objectContaining({ estado: 'NUEVO' }));
        await service.asignar(1, { agenteId: 20 }, admin);
        expect(notificaciones.notificarTicketAsignado).toHaveBeenCalledWith(expect.objectContaining({ estado: 'EN_PROGRESO' }));
        await service.estado(1, { estado: 'CERRADO', notaResolucion: 'Listo' }, admin);
        expect(notificaciones.notificarCambioEstado).toHaveBeenCalledWith(expect.objectContaining({ estado: 'CERRADO' }), 'EN_PROGRESO', 'CERRADO', 'Listo');
        expect(f.repo.transaction.mock.invocationCallOrder[0]).toBeLessThan(notificaciones.notificarTicketCreado.mock.invocationCallOrder[0]!);
        expect(notificaciones.notificarCambioEstado).toHaveBeenCalledOnce();
    });
    it('fallos del servicio de correo no revierten operaciones confirmadas', async () => {
        notificaciones.notificarTicketCreado.mockRejectedValue(new Error('SMTP simulado'));
        notificaciones.notificarTicketAsignado.mockRejectedValue(new Error('SMTP simulado'));
        notificaciones.notificarCambioEstado.mockRejectedValue(new Error('SMTP simulado'));
        await expect(service.create(f.crear, admin)).resolves.toMatchObject({ id: 2 });
        await expect(service.asignar(1, { agenteId: 20 }, admin)).resolves.toMatchObject({ estado: 'EN_PROGRESO' });
        await expect(service.estado(1, { estado: 'CERRADO', notaResolucion: 'Listo' }, admin)).resolves.toMatchObject({ estado: 'CERRADO' });
        expect(f.rows).toHaveLength(2);
        expect(f.ticket.fechaCierre).toBeTruthy();
    });
    it('no notifica cambios de prioridad como Spring Boot', async () => {
        await service.prioridad(1, { prioridad: 'P1_CRITICA', usuarioId: 30 }, admin);
        expect(notificaciones.notificarTicketCreado).not.toHaveBeenCalled();
        expect(notificaciones.notificarTicketAsignado).not.toHaveBeenCalled();
        expect(notificaciones.notificarCambioEstado).not.toHaveBeenCalled();
    });
});
