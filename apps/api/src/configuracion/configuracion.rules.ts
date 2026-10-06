import { BadRequestException } from '@nestjs/common';
import { objeto } from '../tickets/tickets.dto.js';
import type { ConfiguracionSistema } from './configuracion-sistema.service.js';

export const FLAGS_CONFIGURACION = [
    ['crearTicketActivo', 'CREAR_TICKET', 'GLOBAL'], ['solicitudesRecursosActivo', 'SOLICITUDES_RECURSOS', 'GLOBAL'],
    ['reportesActivos', 'REPORTES', 'GLOBAL'], ['historialActivo', 'HISTORIAL', 'GLOBAL'],
    ['crearTicketCliente', 'CREAR_TICKET', 'CLIENTE'], ['crearTicketAgente', 'CREAR_TICKET', 'AGENTE'],
    ['crearTicketSupervisor', 'CREAR_TICKET', 'SUPERVISOR'], ['crearTicketAdmin', 'CREAR_TICKET', 'ADMIN'],
    ['solicitudesRecursosCliente', 'SOLICITUDES_RECURSOS', 'CLIENTE'], ['solicitudesRecursosAgente', 'SOLICITUDES_RECURSOS', 'AGENTE'],
    ['solicitudesRecursosSupervisor', 'SOLICITUDES_RECURSOS', 'SUPERVISOR'], ['solicitudesRecursosAdmin', 'SOLICITUDES_RECURSOS', 'ADMIN'],
    ['reportesCliente', 'REPORTES', 'CLIENTE'], ['reportesAgente', 'REPORTES', 'AGENTE'],
    ['reportesSupervisor', 'REPORTES', 'SUPERVISOR'], ['reportesAdmin', 'REPORTES', 'ADMIN'],
    ['historialCliente', 'HISTORIAL', 'CLIENTE'], ['historialAgente', 'HISTORIAL', 'AGENTE'],
    ['historialSupervisor', 'HISTORIAL', 'SUPERVISOR'], ['historialAdmin', 'HISTORIAL', 'ADMIN'],
] as const;
export type FlagConfiguracion = typeof FLAGS_CONFIGURACION[number][0];
export type ConfiguracionDTO = Record<FlagConfiguracion, boolean>;
export type ActualizarConfiguracion = Partial<Record<FlagConfiguracion, boolean | null>>;
export function configuracionDTO(c: Partial<Record<FlagConfiguracion, boolean | null>>): ConfiguracionDTO {
    return Object.fromEntries(FLAGS_CONFIGURACION.map(([campo]) => [campo, c[campo] ?? true])) as ConfiguracionDTO;
}
export function actualizarConfiguracionDTO(value: unknown): ActualizarConfiguracion {
    const body = objeto(value);
    for (const [campo] of FLAGS_CONFIGURACION.slice(0, 4)) {
        if (body[campo] == null) throw new BadRequestException('Los estados globales de los módulos son obligatorios.');
    }
    const result: ActualizarConfiguracion = {};
    for (const [campo] of FLAGS_CONFIGURACION) {
        const v = body[campo];
        if (v != null && typeof v !== 'boolean') throw new BadRequestException(`${campo} debe ser booleano.`);
        result[campo] = v as boolean | null | undefined;
    }
    return result;
}
export function resolverConfiguracion(actual: ConfiguracionSistema, dto: ActualizarConfiguracion): ConfiguracionDTO {
    return Object.fromEntries(FLAGS_CONFIGURACION.map(([campo]) => [campo, dto[campo] ?? actual[campo] ?? true])) as ConfiguracionDTO;
}
