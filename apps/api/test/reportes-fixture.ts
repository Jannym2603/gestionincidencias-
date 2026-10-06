import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { ticketsFixture } from './tickets-fixture.js';
import type { TicketCompleto } from '../src/tickets/tickets.repository.js';
import type { ReportesRepository } from '../src/reportes/reportes.repository.js';
import type { Solicitud } from '../src/solicitudes-recursos/solicitudes-recursos.repository.js';
import { CONFIGURACION_INICIAL } from '../src/configuracion/configuracion-sistema.service.js';

interface ReportesFixture {
    tickets: ReturnType<typeof ticketsFixture>;
    rows: TicketCompleto[];
    solicitudes: Solicitud[];
    comentarios: { ticketId: number; tipoComentario: string | null }[];
    roles: Record<number, string>;
    repo: { [K in keyof ReportesRepository]: Mock };
    config: typeof CONFIGURACION_INICIAL & { id: number };
    configService: { obtenerOCrear: Mock };
}
export function reportesFixture(): ReportesFixture {
    const tickets = ticketsFixture();
    Object.assign(tickets.proyecto.compania, { id: 1 });
    const rows = tickets.rows;
    rows.length = 0;
    const nuevo = (id: number, estado: string, prioridad: string, tipo: string, clienteId = 10, agenteId = 20) => ({
        ...tickets.ticket, id, estado, prioridad, clienteId, agenteAsignadoId: agenteId,
        cliente: { ...tickets.cliente, id: clienteId }, agenteAsignado: { ...tickets.agente, id: agenteId },
        tipoIncidencia: { id: id <= 2 ? 1 : 2, nombre: tipo } } as unknown as TicketCompleto);
    ['NUEVO', 'ASIGNADO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'].forEach((estado, i) => rows.push(nuevo(i + 1, estado,
        ['P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAJA', 'P4_BAJA'][i]!, i < 2 ? 'Hardware' : 'Software', i < 2 ? 10 : 11, i < 3 ? 20 : 21)));
    const ahora = Temporal.Now.plainDateTimeISO();
    const solicitudes: Solicitud[] = [];
    ['NUEVO', 'EN_VALIDACION', 'SOLICITADO_PROVEEDOR', 'ESPERANDO_PROVEEDOR', 'RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'].forEach((estado, i) => {
        const t = nuevo(i + 6, estado === 'CERRADO' ? 'CERRADO' : 'NUEVO', 'P4_BAJA', 'Recursos');
        Object.assign(t, { tipoAtencion: 'RECURSO_EXTERNO' });
        rows.push(t);
        solicitudes.push({ id: i + 1, ticketId: t.id, categoria: 'EQUIPO', recurso: 'Monitor', cantidad: 1,
            proveedor: null, estadoRecurso: estado, fechaCreacion: ahora, fechaActualizacion: null, fechaSolicitudProveedor: null,
            fechaEstimadaEntrega: null, fechaEstimadaEntregaOriginal: null, fechaRecepcion: null, fechaEntregaCliente: null,
            fechaNotificacionRetraso: null, motivoRetraso: null, detalleRetraso: null, observaciones: null } as Solicitud);
    });
    solicitudes[3]!.fechaEstimadaEntregaOriginal = ahora.subtract({ days: 2 });
    solicitudes[3]!.fechaEstimadaEntrega = ahora.add({ days: 2 });
    solicitudes[4]!.fechaSolicitudProveedor = ahora.subtract({ days: 4 });
    solicitudes[4]!.fechaRecepcion = ahora.subtract({ days: 2 });
    solicitudes[5]!.fechaSolicitudProveedor = ahora.subtract({ days: 3 });
    solicitudes[5]!.fechaRecepcion = ahora;
    const ajeno = nuevo(14, 'CERRADO', 'P1_CRITICA', 'Hardware', 12, 22);
    Object.assign(ajeno, { proyectoId: 2, proyecto: { ...tickets.proyecto, id: 2, compania: { ...tickets.proyecto.compania, id: 2 } } });
    rows.push(ajeno);
    const comentarios = [{ ticketId: 1, tipoComentario: 'PUBLICO' }, { ticketId: 1, tipoComentario: 'INTERNO' },
        { ticketId: 2, tipoComentario: null }, { ticketId: 2, tipoComentario: 'OTRO' }, { ticketId: 14, tipoComentario: 'PUBLICO' }];
    const roles: Record<number, string> = { 10: 'CLIENTE', 20: 'AGENTE', 30: 'SUPERVISOR', 40: 'ADMIN' };
    const repo = {
        usuario: vi.fn(async (correo: string) => { const id = Number(/^u(\d+)@example\.test$/.exec(correo)?.[1]); return roles[id] ? { id } : null; }),
        rol: vi.fn(async (id: number) => roles[id] ? { rol: { nombre: roles[id] } } : null),
        findTickets: vi.fn(async (ids: number[] | null, id: number, rol: string) => {
            const permitidos = rows.filter((t) => ids === null || (ids.includes(t.proyectoId) && (rol !== 'CLIENTE' || t.clienteId === id)
                && (rol !== 'AGENTE' || t.agenteAsignadoId === id)));
            return ids === null ? permitidos : permitidos.sort((a, b) => Temporal.PlainDateTime.compare(b.fechaCreacion!, a.fechaCreacion!));
        }),
        totalUsuarios: vi.fn(async () => 12),
        comentarios: vi.fn(async (ids: number[]) => comentarios.filter((c) => ids.includes(c.ticketId))),
        recursos: vi.fn(async (ids: number[]) => solicitudes.filter((s) => ids.includes(s.ticketId))),
    };
    const config = { id: 1, ...CONFIGURACION_INICIAL };
    return { tickets, rows, solicitudes, comentarios, roles, repo, config, configService: { obtenerOCrear: vi.fn(async () => config) } };
}
