import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../security/acceso-proyecto.service.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';
import { ConfiguracionSistemaService } from '../configuracion/configuracion-sistema.service.js';
import { ReportesRepository } from './reportes.repository.js';
import { comentariosPermitidos, conteosTickets, conteosTipos, esOperativo, filtrarTickets, resumenEstados,
    resumenOperacion, resumenRecursos, usuariosRelacionados } from './reportes.rules.js';
import type { FiltrosReporte } from './reportes.rules.js';

export type UsuarioReportes = UsuarioAutenticado & { sub?: unknown };
const SIN_FILTROS: FiltrosReporte = { companiaId: null, proyectoId: null };

@Injectable()
export class ReportesService {
    constructor(private readonly repo: ReportesRepository, private readonly acceso: AccesoProyectoService,
        private readonly configuracion: ConfiguracionSistemaService) {}
    private async alcance(claims: UsuarioReportes, filtros: FiltrosReporte, dashboard = false) {
        if (!dashboard) {
            const c = await this.configuracion.obtenerOCrear();
            const permiso = { ADMIN: true, SUPERVISOR: c.reportesSupervisor, AGENTE: c.reportesAgente, CLIENTE: c.reportesCliente }[claims.rol];
            if (!c.reportesActivos || !permiso) throw new ForbiddenException('No tienes acceso a los reportes.');
        }
        if (typeof claims.sub !== 'string' || !claims.sub) throw new BadRequestException('No se pudo identificar al usuario autenticado.');
        const cuenta = await this.repo.usuario(claims.sub);
        if (!cuenta) throw new BadRequestException('El usuario autenticado no existe.');
        const asignacion = await this.repo.rol(cuenta.id);
        if (!asignacion) throw new BadRequestException('El usuario no tiene un rol asignado.');
        const rol = asignacion.rol?.nombre?.trim().toUpperCase();
        if (!rol) throw new BadRequestException('El rol asignado al usuario no es válido.');
        if (!['ADMIN', 'SUPERVISOR', 'AGENTE', 'CLIENTE'].includes(rol)) throw new ForbiddenException('El rol del usuario no tiene acceso a los reportes.');
        // Spring calcula el alcance con el rol persistido y el usuario identificado por el correo del JWT.
        const usuario = { usuarioId: cuenta.id, rol };
        const ids = await this.acceso.obtenerIdsPermitidos(usuario);
        if (filtros.proyectoId !== null && ids !== null && !ids.includes(filtros.proyectoId)) {
            throw new ForbiddenException('No tienes acceso al proyecto seleccionado.');
        }
        const rows = await this.repo.findTickets(ids, usuario.usuarioId, usuario.rol);
        return { usuario, tickets: filtrarTickets(rows, filtros) };
    }
    async resumen(claims: UsuarioReportes, filtros = SIN_FILTROS, dashboard = false) {
        const { usuario, tickets } = await this.alcance(claims, dashboard ? SIN_FILTROS : filtros, dashboard);
        const global = usuario.rol === 'ADMIN' && (dashboard || (filtros.companiaId === null && filtros.proyectoId === null));
        const ids = tickets.map((t) => t.id);
        const totalUsuarios = global ? await this.repo.totalUsuarios() : usuariosRelacionados(tickets, usuario.usuarioId);
        const comentarios = await this.repo.comentarios(ids);
        return { totalTickets: tickets.length, ...resumenEstados(tickets), totalUsuarios,
            totalComentarios: comentariosPermitidos(comentarios, ids, usuario.rol) };
    }
    async porEstado(claims: UsuarioReportes, filtros: FiltrosReporte) {
        return conteosTickets((await this.alcance(claims, filtros)).tickets, 'estado');
    }
    async porPrioridad(claims: UsuarioReportes, filtros: FiltrosReporte) {
        return conteosTickets((await this.alcance(claims, filtros)).tickets, 'prioridad');
    }
    async porTipo(claims: UsuarioReportes, filtros: FiltrosReporte) {
        return conteosTipos((await this.alcance(claims, filtros)).tickets);
    }
    async operacion(claims: UsuarioReportes, filtros: FiltrosReporte) {
        return resumenOperacion((await this.alcance(claims, filtros)).tickets);
    }
    async recursos(claims: UsuarioReportes, filtros: FiltrosReporte) {
        const { tickets } = await this.alcance(claims, filtros);
        const ids = tickets.filter((t) => !esOperativo(t)).map((t) => t.id);
        const rows = await this.repo.recursos(ids);
        return resumenRecursos(rows.filter((s) => ids.includes(s.ticketId)));
    }
}
