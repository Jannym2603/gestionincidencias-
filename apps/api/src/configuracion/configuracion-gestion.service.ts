import { Injectable } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { ConfiguracionSistemaService } from './configuracion-sistema.service.js';
import { ConfiguracionRepository } from './configuracion.repository.js';
import type { AuditoriaConfiguracion, AuditoriaNueva } from './configuracion.repository.js';
import { actualizarConfiguracionDTO, configuracionDTO, FLAGS_CONFIGURACION, resolverConfiguracion } from './configuracion.rules.js';

export interface UsuarioConfiguracion { sub?: unknown; usuarioId?: unknown }
export function auditoriaDTO(a: AuditoriaConfiguracion) {
    return { id: a.id, usuarioId: a.usuarioId, usuarioNombre: a.usuarioNombre, usuarioCorreo: a.usuarioCorreo,
        crearTicketAnterior: a.crearTicketAnterior, crearTicketNuevo: a.crearTicketNuevo,
        reportesAnterior: a.reportesAnterior, reportesNuevo: a.reportesNuevo, historialAnterior: a.historialAnterior,
        historialNuevo: a.historialNuevo, modulo: a.modulo, rol: a.rol, valorAnterior: a.valorAnterior,
        valorNuevo: a.valorNuevo, fechaCambio: a.fechaCambio };
}

@Injectable()
export class ConfiguracionGestionService {
    constructor(private readonly inicial: ConfiguracionSistemaService, private readonly repo: ConfiguracionRepository) {}
    async obtenerConfiguracion() { return configuracionDTO(await this.inicial.obtenerOCrear()); }
    async obtenerAuditoria() { return (await this.repo.obtenerAuditoria()).map(auditoriaDTO); }
    async actualizarConfiguracion(value: unknown, actor: UsuarioConfiguracion) {
        const dto = actualizarConfiguracionDTO(value);
        return this.repo.transaction(async (repo) => {
            const actual = await repo.obtenerOCrear();
            const anterior = { ...actual };
            const nuevo = resolverConfiguracion(actual, dto);
            const cambios = FLAGS_CONFIGURACION.filter(([campo]) => anterior[campo] !== nuevo[campo]);
            if (!cambios.length) return configuracionDTO(actual);
            await repo.update(actual.id, nuevo);
            const correo = typeof actor.sub === 'string' ? actor.sub : 'desconocido';
            const usuario = await repo.usuario(correo);
            const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}`.trim() : correo;
            const usuarioId = typeof actor.usuarioId === 'number' && Number.isInteger(actor.usuarioId)
                && actor.usuarioId >= -2147483648 && actor.usuarioId <= 2147483647 ? actor.usuarioId : null;
            const anteriorDTO = configuracionDTO(anterior);
            for (const [campo, modulo, rol] of cambios) {
                await repo.auditoria({ usuarioId, usuarioNombre: nombre, usuarioCorreo: correo,
                    crearTicketAnterior: anteriorDTO.crearTicketActivo, crearTicketNuevo: nuevo.crearTicketActivo,
                    reportesAnterior: anteriorDTO.reportesActivos, reportesNuevo: nuevo.reportesActivos,
                    historialAnterior: anteriorDTO.historialActivo, historialNuevo: nuevo.historialActivo,
                    varianteAnterior: 'A', varianteNueva: 'A', modulo, rol,
                    valorAnterior: String(anterior[campo] ?? null), valorNuevo: String(nuevo[campo]),
                    fechaCambio: Temporal.Now.plainDateTimeISO() } as AuditoriaNueva);
            }
            return nuevo;
        });
    }
}
