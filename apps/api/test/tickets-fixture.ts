import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import { coleccion } from './proyectos-fixture.js';
import { TicketsRepository } from '../src/tickets/tickets.repository.js';
import type { TicketCompleto, TicketCambios, TicketNuevo, HistorialNuevo, RecursoNuevo } from '../src/tickets/tickets.repository.js';

interface TicketsFixture {
    repo: { [K in keyof TicketsRepository]: Mock };
    ticket: TicketCompleto;
    rows: TicketCompleto[];
    historial: HistorialNuevo[];
    recursos: RecursoNuevo[];
    cliente: { id: number; nombre: string; apellido: string; estado: boolean; correo: string };
    agente: { id: number; nombre: string; apellido: string; estado: boolean; correo: string };
    proyecto: { id: number; nombre: string; estado: boolean; companiaId: number; compania: { nombre: string; estado: boolean } };
    asignaciones: Record<string, unknown>[];
    UsuarioProyectos: () => ReturnType<typeof coleccion>;
    crear: { titulo: string; descripcion: string; clienteId: number; tipoIncidenciaId: number;
        proyectoId: number; tipoAtencion: string; impacto: string; urgencia: string };
}

export function ticketsFixture(): TicketsFixture {
    const inicio = Temporal.Now.plainDateTimeISO();
    const cliente = { id: 10, nombre: 'Cliente', apellido: 'Prueba', estado: true, correo: 'cliente@example.test' };
    const agente = { id: 20, nombre: 'Agente', apellido: 'Prueba', estado: true, correo: 'agente@example.test' };
    const proyecto = { id: 1, nombre: 'Proyecto', estado: true, companiaId: 1, compania: { nombre: 'Compania', estado: true } };
    const tipo = { id: 1, nombre: 'Incidencia' };
    const ticket = { id: 1, numeroTicket: 'INC-2026-0001', titulo: 'Ticket', descripcion: 'Descripcion', clienteId: 10,
        agenteAsignadoId: null, tipoIncidenciaId: 1, proyectoId: 1, cliente, agenteAsignado: null, proyecto,
        tipoIncidencia: tipo, estado: 'NUEVO', prioridad: 'P3_MEDIA', tipoAtencion: 'OPERATIVO', fechaCreacion: inicio,
        fechaActualizacion: inicio, fechaResolucion: null, fechaCierre: null, fechaPrimeraRespuesta: null,
        fechaLimiteRespuesta: inicio.add({ hours: 4 }), fechaLimiteResolucion: inicio.add({ hours: 24 }),
        slaRespuestaCumplido: null, slaResolucionCumplido: null } as unknown as TicketCompleto;
    const rows = [ticket];
    const historial: HistorialNuevo[] = [];
    const recursos: RecursoNuevo[] = [];
    const repo = {
        transaction: vi.fn(async (_id: number | null, work: (r: TicketsRepository) => Promise<unknown>) => {
            const original = rows.map((r) => ({ ...r }));
            const h = historial.length;
            const s = recursos.length;
            try { return await work(repo as unknown as TicketsRepository); }
            catch (error) {
                original.forEach((row, index) => Object.assign(rows[index]!, row));
                rows.length = original.length;
                historial.length = h;
                recursos.length = s;
                throw error;
            }
        }),
        findOne: vi.fn(async (id: number) => {
            const row = rows.find((t) => t.id === id);
            return row ? { ...row, agenteAsignado: row.agenteAsignadoId === 20 ? agente : null } : null;
        }),
        findAll: vi.fn(async (ids: number[] | null, id: number, rol: string) => rows.filter((t) => ids === null ||
            (ids.includes(t.proyectoId) && (rol !== 'CLIENTE' || t.clienteId === id) && (rol !== 'AGENTE' || t.agenteAsignadoId === id)))),
        findUsuario: vi.fn(async (id: number) => id === 10 ? cliente : id === 20 ? agente : null),
        findRol: vi.fn(async (id: number) => ({ rol: { nombre: id === 10 ? 'CLIENTE' : 'AGENTE' } })),
        findProyecto: vi.fn(async (id: number) => id === 1 ? proyecto : null),
        findTipo: vi.fn(async (id: number) => id === 1 ? tipo : null),
        configuracion: vi.fn(async () => ({ crearTicketActivo: true, crearTicketCliente: true,
            crearTicketAgente: true, crearTicketSupervisor: true, crearTicketAdmin: false })),
        numeroTicket: vi.fn(async (anio: number) => `INC-${anio}-0002`),
        create: vi.fn(async (data: TicketNuevo) => {
            const row = { ...ticket, ...data, id: 2 } as TicketCompleto;
            rows.push(row);
            return row;
        }),
        update: vi.fn(async (id: number, data: TicketCambios) => { Object.assign(rows.find((t) => t.id === id)!, data); }),
        historial: vi.fn(async (data: HistorialNuevo) => { historial.push(data); }),
        recurso: vi.fn(async (data: RecursoNuevo) => { recursos.push(data); }),
    };
    const asignaciones = [10, 20, 30].map((usuarioId) => ({ usuarioId, proyectoId: 1, estado: true, proyecto }));
    return { repo: repo as { [K in keyof TicketsRepository]: Mock }, ticket, rows, historial, recursos, cliente, agente, proyecto,
        asignaciones, UsuarioProyectos: () => coleccion(asignaciones),
        crear: { titulo: 'Nuevo', descripcion: 'Descripcion', clienteId: 10, tipoIncidenciaId: 1,
            proyectoId: 1, tipoAtencion: 'OPERATIVO', impacto: 'ALTO', urgencia: 'ALTA' } };
}
