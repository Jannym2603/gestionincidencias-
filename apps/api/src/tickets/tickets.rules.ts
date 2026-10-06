import { BadRequestException, ConflictException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import type { TicketCompleto } from './tickets.repository.js';

export function prioridad(impacto: string, urgencia: string): string {
    if (impacto === 'ALTO' && urgencia === 'ALTA') return 'P1_CRITICA';
    if ((impacto === 'ALTO' && urgencia === 'MEDIA') || (impacto === 'MEDIO' && urgencia === 'ALTA')) return 'P2_ALTA';
    if (impacto === 'MEDIO' && urgencia === 'MEDIA') return 'P3_MEDIA';
    return 'P4_BAJA';
}

export function fechasSla(prioridad: string, inicio: Temporal.PlainDateTime, externo: boolean) {
    const tiempos: Record<string, [number, number]> = {
        P1_CRITICA: [30, 4], P2_ALTA: [60, 8], P3_MEDIA: [240, 24], P4_BAJA: [480, 72],
    };
    const valores = tiempos[prioridad];
    if (!valores) throw new BadRequestException('Prioridad no valida.');
    return {
        fechaLimiteRespuesta: inicio.add({ minutes: valores[0] }),
        fechaLimiteResolucion: externo ? null : inicio.add({ hours: valores[1] }),
    };
}

export function validarTransicion(ticket: TicketCompleto, estado: string, nota: string | null) {
    if (ticket.tipoAtencion?.toUpperCase() === 'RECURSO_EXTERNO') {
        throw new ConflictException('Los recursos externos no utilizan el flujo operativo de estados.');
    }
    const transiciones: Record<string, string[]> = {
        NUEVO: ['EN_PROGRESO'], ASIGNADO: ['EN_PROGRESO'], EN_PROGRESO: ['CERRADO'], RESUELTO: ['CERRADO'], CERRADO: [],
    };
    if (!transiciones[ticket.estado]?.includes(estado)) throw new BadRequestException('Transicion no permitida.');
    if (estado === 'EN_PROGRESO' && ticket.agenteAsignadoId == null) {
        throw new BadRequestException('Debes asignar un agente antes de iniciar el ticket.');
    }
    if (estado === 'CERRADO' && !nota) throw new BadRequestException('Debes agregar una nota de cierre.');
}

export function cumplido(fecha: Temporal.PlainDateTime | null, limite: Temporal.PlainDateTime | null) {
    return fecha && limite ? Temporal.PlainDateTime.compare(fecha, limite) <= 0 : null;
}

function estadoSla(inicio: Temporal.PlainDateTime | null, limite: Temporal.PlainDateTime | null, fin: Temporal.PlainDateTime | null, ahora: Temporal.PlainDateTime) {
    if (!inicio || !limite) return 'SIN_CONFIGURAR';
    if (fin) return cumplido(fin, limite) ? 'CUMPLIDO' : 'INCUMPLIDO';
    if (Temporal.PlainDateTime.compare(ahora, limite) > 0) return 'VENCIDO';
    const total = Math.trunc(inicio.until(limite).total('minutes'));
    const usado = Math.max(0, Math.trunc(inicio.until(ahora).total('minutes')));
    if (total <= 0) return 'VENCIDO';
    return usado / total >= 0.75 ? 'EN_RIESGO' : 'EN_TIEMPO';
}

export function ticketDTO(t: TicketCompleto, ahora = Temporal.Now.plainDateTimeISO()) {
    const externo = t.tipoAtencion?.toUpperCase() === 'RECURSO_EXTERNO';
    const faltan = !t.fechaLimiteRespuesta || (!externo && !t.fechaLimiteResolucion);
    const fechas = faltan ? fechasSla(t.prioridad, t.fechaCreacion ?? ahora, externo) : t;
    const nombre = (u: typeof t.cliente | null) => u ? `${u.nombre} ${u.apellido}` : null;
    return {
        id: t.id, numeroTicket: t.numeroTicket, titulo: t.titulo, descripcion: t.descripcion,
        tipoIncidenciaId: t.tipoIncidenciaId, tipoIncidenciaNombre: t.tipoIncidencia?.nombre ?? null,
        clienteId: t.clienteId, clienteNombre: nombre(t.cliente), clienteCorreo: t.cliente?.correo ?? null,
        agenteId: t.agenteAsignadoId, agenteNombre: nombre(t.agenteAsignado),
        proyectoId: t.proyectoId, proyectoNombre: t.proyecto?.nombre ?? null,
        companiaId: t.proyecto?.companiaId ?? null, companiaNombre: t.proyecto?.compania?.nombre ?? null,
        tipoAtencion: t.tipoAtencion, estado: t.estado, prioridad: t.prioridad,
        severidad: t.severidad, criticidad: t.criticidad, impacto: t.impacto, urgencia: t.urgencia,
        fechaCreacion: t.fechaCreacion, fechaActualizacion: t.fechaActualizacion,
        fechaResolucion: t.fechaResolucion, fechaCierre: t.fechaCierre,
        fechaLimiteRespuesta: fechas.fechaLimiteRespuesta, fechaPrimeraRespuesta: t.fechaPrimeraRespuesta,
        slaRespuestaCumplido: faltan ? cumplido(t.fechaPrimeraRespuesta, fechas.fechaLimiteRespuesta) : t.slaRespuestaCumplido,
        fechaLimiteResolucion: fechas.fechaLimiteResolucion,
        slaResolucionCumplido: externo ? null : faltan ? cumplido(t.fechaResolucion, fechas.fechaLimiteResolucion) : t.slaResolucionCumplido,
        estadoSlaRespuesta: estadoSla(t.fechaCreacion, fechas.fechaLimiteRespuesta, t.fechaPrimeraRespuesta, ahora),
        estadoSlaResolucion: externo ? 'NO_APLICA' : estadoSla(t.fechaCreacion, fechas.fechaLimiteResolucion, t.fechaResolucion, ahora),
    };
}
