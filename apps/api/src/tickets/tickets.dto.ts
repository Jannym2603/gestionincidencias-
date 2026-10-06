import { BadRequestException } from '@nestjs/common';

export function objeto(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new BadRequestException('El cuerpo debe ser un objeto.');
    }
    return value as Record<string, unknown>;
}

export function texto(value: unknown, campo: string, max = Infinity): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
        throw new BadRequestException(`${campo} no es valido.`);
    }
    return value.trim();
}

export function opcional(value: unknown, campo: string, max = Infinity): string | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || value.trim().length > max) {
        throw new BadRequestException(`${campo} no es valido.`);
    }
    return value.trim() || null;
}

export function identificador(value: unknown, campo: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > 2147483647) {
        throw new BadRequestException(`${campo} no es valido.`);
    }
    return value;
}

export function crearTicketDTO(value: unknown) {
    const body = objeto(value);
    const tipoAtencion = body.tipoAtencion == null || body.tipoAtencion === '' || typeof body.tipoAtencion === 'string' && !body.tipoAtencion.trim()
        ? 'OPERATIVO' : texto(body.tipoAtencion, 'tipoAtencion').toUpperCase();
    if (!['OPERATIVO', 'RECURSO_EXTERNO'].includes(tipoAtencion)) {
        throw new BadRequestException('Tipo de atencion no valido.');
    }
    const recurso = tipoAtencion !== 'RECURSO_EXTERNO' || body.solicitudRecurso == null ? null : objeto(body.solicitudRecurso);
    if (tipoAtencion === 'RECURSO_EXTERNO' && !recurso) {
        throw new BadRequestException('Debes completar la solicitud de recurso.');
    }
    return {
        titulo: texto(body.titulo, 'titulo', 150),
        descripcion: texto(body.descripcion, 'descripcion'),
        tipoIncidenciaId: identificador(body.tipoIncidenciaId, 'tipoIncidenciaId'),
        clienteId: identificador(body.clienteId, 'clienteId'),
        proyectoId: identificador(body.proyectoId, 'proyectoId'),
        tipoAtencion,
        impacto: texto(body.impacto, 'impacto', 30).toUpperCase(),
        urgencia: texto(body.urgencia, 'urgencia', 30).toUpperCase(),
        severidad: opcional(body.severidad, 'severidad', 30),
        criticidad: opcional(body.criticidad, 'criticidad', 30),
        solicitudRecurso: recurso ? {
            categoria: texto(recurso.categoria, 'categoria', 80).toUpperCase(),
            recurso: texto(recurso.recurso, 'recurso', 150),
            cantidad: identificador(recurso.cantidad, 'cantidad'),
            observaciones: opcional(recurso.observaciones, 'observaciones'),
        } : null,
    };
}

export type CrearTicketDTO = ReturnType<typeof crearTicketDTO>;
