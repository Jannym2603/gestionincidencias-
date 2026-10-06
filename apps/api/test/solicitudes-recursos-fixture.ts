import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { ticketsFixture } from './tickets-fixture.js';
import { CONFIGURACION_INICIAL } from '../src/configuracion/configuracion-sistema.service.js';
import type { Solicitud, SolicitudCompleta, SolicitudesRecursosRepository } from '../src/solicitudes-recursos/solicitudes-recursos.repository.js';
import type { RecursoNuevo } from '../src/tickets/tickets.repository.js';

interface SolicitudesFixture {
    f: ReturnType<typeof ticketsFixture>;
    solicitud: Solicitud;
    rows: Solicitud[];
    completa: (s: Solicitud) => SolicitudCompleta;
    repo: { [K in keyof SolicitudesRecursosRepository]: Mock };
    config: typeof CONFIGURACION_INICIAL & { id: number };
    configService: { obtenerOCrear: Mock };
    notificaciones: { notificarCambioEstadoRecurso: Mock; notificarRecursoRetrasado: Mock;
        notificarTicketCreado: Mock; notificarTicketAsignado: Mock; notificarCambioEstado: Mock };
}
export function solicitudesFixture(): SolicitudesFixture {
    const f = ticketsFixture();
    f.ticket.tipoAtencion = 'RECURSO_EXTERNO' as typeof f.ticket.tipoAtencion;
    f.ticket.agenteAsignadoId = 20;
    const solicitud = { id: 1, ticketId: 1, categoria: 'EQUIPO', recurso: 'Monitor', cantidad: 1, proveedor: null,
        estadoRecurso: 'NUEVO', fechaCreacion: Temporal.Now.plainDateTimeISO(), fechaActualizacion: null,
        fechaSolicitudProveedor: null, fechaEstimadaEntrega: null, fechaEstimadaEntregaOriginal: null,
        fechaRecepcion: null, fechaEntregaCliente: null, fechaNotificacionRetraso: null, motivoRetraso: null,
        detalleRetraso: null, observaciones: null } as Solicitud;
    const rows: Solicitud[] = [solicitud];
    const completa = (s: Solicitud): SolicitudCompleta => ({ ...s, ticket: f.rows.find((t) => t.id === s.ticketId) ?? null });
    const repo = { findAll: vi.fn(async () => rows.map(completa)),
        findOne: vi.fn(async (id: number) => { const s = rows.find((s) => s.id === id); return s ? completa(s) : null; }),
        findByTicket: vi.fn(async (id: number) => { const s = rows.find((s) => s.ticketId === id); return s ? completa(s) : null; }) };
    f.repo.findRecurso = vi.fn(async (id: number) => { const s = rows.find((s) => s.id === id); return s ? { ...s } : null; });
    f.repo.updateRecurso = vi.fn(async (id: number, data: Partial<RecursoNuevo>) => Object.assign(rows.find((s) => s.id === id)!, data));
    f.repo.recurso.mockImplementation(async (data: RecursoNuevo) => { const s = { ...solicitud, ...data, id: rows.length + 1 } as Solicitud; rows.push(s); f.recursos.push(data); return s; });
    const transaction = f.repo.transaction.getMockImplementation()!;
    f.repo.transaction.mockImplementation(async (...args) => {
        const originales = rows.map((r) => ({ ...r }));
        try { return await transaction(...args); }
        catch (error) { originales.forEach((r, i) => Object.assign(rows[i]!, r)); rows.length = originales.length; throw error; }
    });
    const config = { id: 1, ...CONFIGURACION_INICIAL };
    const configService = { obtenerOCrear: vi.fn(async () => config) };
    const notificaciones = { notificarCambioEstadoRecurso: vi.fn(async () => true), notificarRecursoRetrasado: vi.fn(async () => true),
        notificarTicketCreado: vi.fn(async () => true), notificarTicketAsignado: vi.fn(async () => true), notificarCambioEstado: vi.fn(async () => true) };
    return { f, solicitud, rows, completa, repo, config, configService, notificaciones };
}
