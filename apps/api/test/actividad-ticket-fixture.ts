import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { ticketsFixture } from './tickets-fixture.js';
import { CONFIGURACION_INICIAL } from '../src/configuracion/configuracion-sistema.service.js';
import type { ConfiguracionSistema } from '../src/configuracion/configuracion-sistema.service.js';
import type { ComentariosRepository, ComentarioCompleto } from '../src/comentarios/comentarios.repository.js';
import type { HistorialTicketsRepository, HistorialCompleto } from '../src/historial-tickets/historial-tickets.repository.js';
import type { AdjuntosRepository, Adjunto, AdjuntoNuevo } from '../src/adjuntos/adjuntos.repository.js';
import type { ComentarioNuevo, TicketCompleto } from '../src/tickets/tickets.repository.js';

interface ActividadFixture {
    tickets: ReturnType<typeof ticketsFixture>;
    comentarios: ComentarioCompleto[];
    historial: HistorialCompleto[];
    adjuntos: Adjunto[];
    comentariosRepo: { [K in keyof ComentariosRepository]: Mock };
    historialRepo: { [K in keyof HistorialTicketsRepository]: Mock };
    adjuntosRepo: { [K in keyof AdjuntosRepository]: Mock };
    configuracion: ConfiguracionSistema;
    configService: { obtenerOCrear: Mock };
    notificaciones: { notificarComentarioPublico: Mock; notificarTicketCreado: Mock; notificarTicketAsignado: Mock; notificarCambioEstado: Mock };
}

export function actividadFixture(): ActividadFixture {
    const tickets = ticketsFixture();
    tickets.ticket.agenteAsignadoId = 20;
    tickets.ticket.estado = 'EN_PROGRESO' as typeof tickets.ticket.estado;
    const otro = { ...tickets.ticket, id: 2, proyectoId: 2, clienteId: 11, agenteAsignadoId: 21, numeroTicket: 'INC-2026-0002' } as TicketCompleto;
    const antiguo = { ...tickets.ticket, id: 3, proyectoId: 3, clienteId: 10, agenteAsignadoId: null, numeroTicket: 'INC-2026-0003' } as TicketCompleto;
    tickets.rows.push(otro, antiguo);
    const autor = { id: 30, nombre: 'Soporte', apellido: 'Prueba', correo: 'soporte@example.test', password: 'dato-sintetico-no-publico' };
    const buscarUsuario = tickets.repo.findUsuario.getMockImplementation()!;
    tickets.repo.findUsuario.mockImplementation(async (id: number) => id === 30 ? autor : buscarUsuario(id));
    tickets.repo.findRol.mockImplementation(async (id: number) => ({ rol: { nombre: id === 10 ? 'CLIENTE' : id === 30 ? 'SUPERVISOR' : 'AGENTE' } }));
    const fecha = Temporal.PlainDateTime.from('2026-01-01T10:00');
    const comentario = (id: number, ticket: TicketCompleto, usuarioId: number, tipo: string) => ({ id, ticketId: ticket.id, ticket,
        usuarioId, usuario: usuarioId === 10 ? tickets.cliente : usuarioId === 20 ? tickets.agente : autor,
        contenido: `Comentario ${id}`, tipoComentario: tipo, fechaCreacion: fecha.add({ hours: id }) } as unknown as ComentarioCompleto);
    const comentarios = [comentario(1, tickets.ticket, 10, 'PUBLICO'), comentario(2, tickets.ticket, 30, 'INTERNO'),
        comentario(3, tickets.ticket, 20, 'PUBLICO'), comentario(4, otro, 30, 'PUBLICO'), comentario(5, antiguo, 10, 'PUBLICO')];
    const evento = (id: number, ticket: TicketCompleto, usuarioId: number | null) => ({ id, ticketId: ticket.id, ticket, usuarioId,
        usuario: usuarioId === null ? null : usuarioId === 10 ? tickets.cliente : autor, accion: 'CREACION_TICKET',
        valorAnterior: null, valorNuevo: 'NUEVO', descripcion: 'Evento', fechaCreacion: fecha.add({ hours: id }) } as unknown as HistorialCompleto);
    const historial = [evento(1, tickets.ticket, 10), evento(2, tickets.ticket, 30), evento(3, tickets.ticket, null), evento(4, otro, 30), evento(5, antiguo, 10)];
    const adjuntos: Adjunto[] = [];
    tickets.repo.comentario = vi.fn(async (data: ComentarioNuevo) => {
        const row = { ...data, id: comentarios.length + 1, ticket: tickets.rows.find((t) => t.id === data.ticketId)!,
            usuario: await tickets.repo.findUsuario(data.usuarioId) } as ComentarioCompleto;
        comentarios.push(row);
        return row;
    });
    const transaction = tickets.repo.transaction.getMockImplementation()!;
    tickets.repo.transaction.mockImplementation(async (...args) => {
        const cantidad = comentarios.length;
        try { return await transaction(...args); }
        catch (error) { comentarios.length = cantidad; throw error; }
    });
    const todosHistorial = () => [...historial, ...tickets.historial.map((h, i) => ({ ...h, id: 6 + i,
        ticket: tickets.rows.find((t) => t.id === h.ticketId)!, usuario: h.usuarioId === 10 ? tickets.cliente : autor } as unknown as HistorialCompleto))];
    const configuracion = { id: 1, ...CONFIGURACION_INICIAL };
    return { tickets, comentarios, historial, adjuntos, configuracion,
        configService: { obtenerOCrear: vi.fn(async () => configuracion) },
        notificaciones: { notificarComentarioPublico: vi.fn(async () => true), notificarTicketCreado: vi.fn(async () => true),
            notificarTicketAsignado: vi.fn(async () => undefined), notificarCambioEstado: vi.fn(async () => true) },
        comentariosRepo: { findAll: vi.fn(async () => comentarios), findByTicket: vi.fn(async (id: number) => comentarios.filter((c) => c.ticketId === id)) },
        historialRepo: { findAll: vi.fn(async () => todosHistorial()), findByTicket: vi.fn(async (id: number) => todosHistorial().filter((h) => h.ticketId === id)
            .sort((a, b) => Temporal.PlainDateTime.compare(b.fechaCreacion!, a.fechaCreacion!))) },
        adjuntosRepo: { findOne: vi.fn(async (id: number) => adjuntos.find((a) => a.id === id) ?? null),
            findByTicket: vi.fn(async (id: number) => adjuntos.filter((a) => a.ticketId === id).sort((a, b) => Temporal.PlainDateTime.compare(b.fechaSubida, a.fechaSubida))),
            create: vi.fn(async (data: AdjuntoNuevo) => { const row = { ...data, id: adjuntos.length + 1 } as Adjunto; adjuntos.push(row); return row; }) },
    };
}
