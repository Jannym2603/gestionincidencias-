import { BadRequestException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import type { TicketCompleto } from '../tickets/tickets.repository.js';
import type { Solicitud } from '../solicitudes-recursos/solicitudes-recursos.repository.js';
import { seguimiento } from '../solicitudes-recursos/solicitudes-recursos.rules.js';

export const ESTADOS_REPORTE = ['NUEVO', 'ASIGNADO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO'] as const;
export const PRIORIDADES_REPORTE = ['P1_CRITICA', 'P2_ALTA', 'P3_MEDIA', 'P4_BAJA'] as const;
export interface FiltrosReporte { companiaId: number | null; proyectoId: number | null }
export function filtrosReporte(query: Record<string, unknown>): FiltrosReporte {
    const id = (value: unknown) => {
        if (value == null || value === '') return null;
        if (typeof value !== 'string' || !/^\+?\d+$/.test(value)) throw new BadRequestException('Filtro de reporte no valido.');
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n <= 0 || n > 2147483647) throw new BadRequestException('Filtro de reporte no valido.');
        return n;
    };
    return { companiaId: id(query.companiaId), proyectoId: id(query.proyectoId) };
}
export function filtrarTickets(rows: TicketCompleto[], filtros: FiltrosReporte) {
    return rows.filter((t) => (filtros.proyectoId === null || t.proyecto?.id === filtros.proyectoId)
        && (filtros.companiaId === null || t.proyecto?.compania?.id === filtros.companiaId));
}
export function conteosTickets(rows: TicketCompleto[], campo: 'estado' | 'prioridad') {
    // Spring equalsIgnoreCase no quita espacios ni fusiona estados históricos.
    const nombres = campo === 'estado' ? ESTADOS_REPORTE : PRIORIDADES_REPORTE;
    return nombres.map((nombre) => ({ nombre, total: rows.filter((t) => String(t[campo]).toUpperCase() === nombre).length }));
}
export function conteosTipos(rows: TicketCompleto[]) {
    const conteos = new Map<string, number>();
    for (const t of rows) {
        const nombre = t.tipoIncidencia?.nombre;
        if (nombre != null) conteos.set(nombre, (conteos.get(nombre) ?? 0) + 1);
    }
    return Array.from(conteos, ([nombre, total]) => ({ nombre, total }));
}
export function resumenEstados(rows: TicketCompleto[]) {
    const c = conteosTickets(rows, 'estado');
    return { ticketsNuevos: c[0]!.total, ticketsAsignados: c[1]!.total, ticketsEnProgreso: c[2]!.total,
        ticketsResueltos: c[3]!.total, ticketsCerrados: c[4]!.total };
}
export function usuariosRelacionados(rows: TicketCompleto[], usuarioId: number) {
    const ids = new Set([usuarioId]);
    for (const t of rows) {
        if (t.cliente?.id != null) ids.add(t.cliente.id);
        if (t.agenteAsignado?.id != null) ids.add(t.agenteAsignado.id);
    }
    return ids.size;
}
export function comentariosPermitidos(rows: { ticketId: number; tipoComentario: string | null }[], ticketIds: number[], rol: string) {
    const ids = new Set(ticketIds);
    return rows.filter((c) => ids.has(c.ticketId) && (rol !== 'CLIENTE' || c.tipoComentario?.trim().toUpperCase() !== 'INTERNO')).length;
}
export const esOperativo = (t: TicketCompleto) => (t.tipoAtencion || 'OPERATIVO').trim().toUpperCase() !== 'RECURSO_EXTERNO';
export function resumenOperacion(rows: TicketCompleto[]) {
    const operativos = rows.filter(esOperativo);
    return { totalOperativos: operativos.length, ...resumenEstados(operativos) };
}
export function resumenRecursos(rows: Solicitud[], ahora = Temporal.Now.plainDateTimeISO()) {
    const estado = (s: Solicitud) => (s.estadoRecurso || 'NUEVO').trim().toUpperCase();
    const contar = (valor: string) => rows.filter((s) => estado(s) === valor).length;
    const limite = ahora.add({ days: 7 });
    const proximasEntregas = rows.filter((s) => s.fechaEstimadaEntrega && !['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'].includes(estado(s))
        && Temporal.PlainDateTime.compare(s.fechaEstimadaEntrega, ahora) >= 0 && Temporal.PlainDateTime.compare(s.fechaEstimadaEntrega, limite) <= 0).length;
    const duraciones = rows.flatMap((s) => {
        if (!s.fechaSolicitudProveedor || !s.fechaRecepcion || Temporal.PlainDateTime.compare(s.fechaRecepcion, s.fechaSolicitudProveedor) < 0) return [];
        return [s.fechaSolicitudProveedor.until(s.fechaRecepcion, { largestUnit: 'hours' }).total({ unit: 'days' })];
    });
    return { totalSolicitudes: rows.length, nuevas: contar('NUEVO'), enValidacion: contar('EN_VALIDACION'),
        solicitadasProveedor: contar('SOLICITADO_PROVEEDOR'), esperandoProveedor: contar('ESPERANDO_PROVEEDOR'), recibidas: contar('RECIBIDO'),
        entregadas: contar('ENTREGADO'), cerradas: contar('CERRADO'), canceladas: contar('CANCELADO'),
        retrasadas: rows.filter((s) => seguimiento(s, ahora).retrasada).length, proximasEntregas,
        promedioDiasProveedor: duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : 0 };
}
