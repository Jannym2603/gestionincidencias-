import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { identificador, objeto, opcional, texto } from '../tickets/tickets.dto.js';
import type { Solicitud, SolicitudCompleta } from './solicitudes-recursos.repository.js';

export const TRANSICIONES: Record<string, readonly string[]> = {
    NUEVO: ['EN_VALIDACION', 'CANCELADO'], EN_VALIDACION: ['SOLICITADO_PROVEEDOR', 'CANCELADO'],
    SOLICITADO_PROVEEDOR: ['ESPERANDO_PROVEEDOR', 'RECIBIDO', 'CANCELADO'], ESPERANDO_PROVEEDOR: ['RECIBIDO', 'CANCELADO'],
    RECIBIDO: ['ENTREGADO'], ENTREGADO: ['CERRADO'], CERRADO: [], CANCELADO: [],
};
const FINALIZADOS = ['RECIBIDO', 'ENTREGADO', 'CERRADO', 'CANCELADO'];
export function fechaJava(v: Temporal.PlainDateTime): string {
    const base = v.toString({ smallestUnit: 'minute' });
    const nano = v.millisecond * 1000000 + v.microsecond * 1000 + v.nanosecond;
    if (!v.second && !nano) return base;
    const segundos = `${base}:${String(v.second).padStart(2, '0')}`;
    if (!nano) return segundos;
    const digitos = nano % 1000000 === 0 ? 3 : nano % 1000 === 0 ? 6 : 9;
    return `${segundos}.${String(nano).padStart(9, '0').slice(0, digitos)}`;
}
export const normalizar = (v: unknown): string | null => v == null ? null
    : (v instanceof Temporal.PlainDateTime ? fechaJava(v) : String(v)).trim() || null;
export const estado = (s: Solicitud) => s.estadoRecurso?.trim().toUpperCase() ?? 'NUEVO';
export function seguimiento(s: Solicitud, ahora = Temporal.Now.plainDateTimeISO()) {
    const base = s.fechaEstimadaEntregaOriginal ?? s.fechaEstimadaEntrega;
    const referencia = s.fechaRecepcion ?? ahora;
    const retrasada = !!base && !FINALIZADOS.includes(estado(s)) && Temporal.PlainDateTime.compare(ahora, base) > 0;
    const tuvoRetraso = !!base && !!s.fechaRecepcion && Temporal.PlainDateTime.compare(s.fechaRecepcion, base) > 0;
    const reprogramada = !!s.fechaEstimadaEntregaOriginal && !!s.fechaEstimadaEntrega
        && Temporal.PlainDateTime.compare(s.fechaEstimadaEntregaOriginal, s.fechaEstimadaEntrega) !== 0;
    const diasRetraso = base && Temporal.PlainDateTime.compare(referencia, base) > 0
        ? Math.max(0, base.toPlainDate().until(referencia.toPlainDate(), { largestUnit: 'days' }).days) : 0;
    const situacionEntrega = estado(s) === 'CANCELADO' ? 'CANCELADO' : FINALIZADOS.includes(estado(s))
        ? (tuvoRetraso ? 'RECIBIDO_CON_RETRASO' : 'RECIBIDO_EN_TIEMPO') : retrasada ? 'RETRASADO'
        : reprogramada ? 'REPROGRAMADO' : !base ? 'SIN_FECHA' : 'EN_TIEMPO';
    return { retrasada, situacionEntrega, diasRetraso };
}
export function solicitudDTO(s: SolicitudCompleta) {
    const t = s.ticket;
    if (!t) throw new NotFoundException('La solicitud no tiene un ticket asociado.');
    return { id: s.id, ticketId: t.id, numeroTicket: t.numeroTicket, tituloTicket: t.titulo, tipoAtencion: t.tipoAtencion,
        clienteId: t.cliente?.id ?? null, clienteNombre: t.cliente ? `${t.cliente.nombre ?? ''} ${t.cliente.apellido ?? ''}`.trim() : null,
        proyectoId: t.proyecto?.id ?? null, proyectoNombre: t.proyecto?.nombre ?? null,
        companiaId: t.proyecto?.compania?.id ?? null, companiaNombre: t.proyecto?.compania?.nombre ?? null,
        categoria: s.categoria, recurso: s.recurso, cantidad: s.cantidad, proveedor: s.proveedor, estadoRecurso: s.estadoRecurso,
        ...seguimiento(s), fechaSolicitudProveedor: s.fechaSolicitudProveedor, fechaEstimadaEntregaOriginal: s.fechaEstimadaEntregaOriginal,
        fechaEstimadaEntrega: s.fechaEstimadaEntrega, fechaRecepcion: s.fechaRecepcion, fechaEntregaCliente: s.fechaEntregaCliente,
        motivoRetraso: s.motivoRetraso, detalleRetraso: s.detalleRetraso, observaciones: s.observaciones,
        fechaCreacion: s.fechaCreacion, fechaActualizacion: s.fechaActualizacion };
}
export function aplicarCambios(s: Solicitud, value: unknown, ahora = Temporal.Now.plainDateTimeISO()) {
    const body = objeto(value);
    const next = { ...s };
    for (const [campo, max] of [['categoria', 80], ['recurso', 150]] as const) {
        if (body[campo] != null) {
            const v = texto(body[campo], campo, max);
            Object.assign(next, { [campo]: campo === 'categoria' ? v.toUpperCase() : v });
        }
    }
    if (body.cantidad != null) next.cantidad = identificador(body.cantidad, 'cantidad');
    for (const [campo, max] of [['proveedor', 150], ['observaciones', Infinity], ['motivoRetraso', 100], ['detalleRetraso', Infinity]] as const) {
        if (body[campo] != null) Object.assign(next, { [campo]: opcional(body[campo], campo, max) });
    }
    for (const campo of ['fechaSolicitudProveedor', 'fechaEstimadaEntrega', 'fechaRecepcion', 'fechaEntregaCliente'] as const) {
        if (body[campo] == null) continue;
        let fecha: Temporal.PlainDateTime;
        try {
            if (typeof body[campo] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(body[campo])) throw new Error();
            fecha = Temporal.PlainDateTime.from(body[campo], { overflow: 'reject' });
        } catch { throw new BadRequestException(`${campo} no es valido.`); }
        if (campo === 'fechaEstimadaEntrega' && (!next[campo] || Temporal.PlainDateTime.compare(next[campo], fecha) !== 0)) {
            next.fechaEstimadaEntregaOriginal ??= next.fechaEstimadaEntrega ?? fecha;
        }
        next[campo] = fecha;
    }
    if (body.estadoRecurso != null) {
        const nuevo = texto(body.estadoRecurso, 'estadoRecurso').toUpperCase();
        const actual = estado(s);
        if (!Object.hasOwn(TRANSICIONES, nuevo) || !Object.hasOwn(TRANSICIONES, actual)) throw new BadRequestException('Estado de recurso no valido.');
        if (nuevo !== actual) {
            if (!TRANSICIONES[actual]!.includes(nuevo)) throw new BadRequestException(`Transición de recurso no permitida: ${actual} -> ${nuevo}.`);
            if (['SOLICITADO_PROVEEDOR', 'ESPERANDO_PROVEEDOR', 'RECIBIDO', 'ENTREGADO', 'CERRADO'].includes(nuevo) && !next.proveedor?.trim()) {
                throw new BadRequestException('Debes indicar el proveedor antes de avanzar la solicitud.');
            }
            if (nuevo === 'ESPERANDO_PROVEEDOR' && !next.fechaEstimadaEntrega) throw new BadRequestException('Debes indicar la fecha estimada de entrega.');
            if (nuevo === 'CERRADO' && !next.fechaEntregaCliente) throw new BadRequestException('La solicitud debe haber sido entregada al cliente antes de cerrarla.');
            next.estadoRecurso = nuevo as Solicitud['estadoRecurso'];
            if (nuevo === 'SOLICITADO_PROVEEDOR') next.fechaSolicitudProveedor ??= ahora;
            if (nuevo === 'RECIBIDO') next.fechaRecepcion ??= ahora;
            if (nuevo === 'ENTREGADO') next.fechaEntregaCliente ??= ahora;
        }
    }
    next.fechaActualizacion = ahora;
    return next;
}
