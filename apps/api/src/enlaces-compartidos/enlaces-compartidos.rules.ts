import { BadRequestException } from '@nestjs/common';
import { Temporal } from 'temporal-polyfill';
import { correoDTO } from '../auth/auth.rules.js';
import { objeto } from '../tickets/tickets.dto.js';

export const SOLO_LECTURA = { puedeVer: true, puedeComentar: false, puedeVerAdjuntos: false, puedeSubirAdjuntos: false, puedeCambiarEstado: false };
export function crearEnlaceDTO(value: unknown, ahora = Temporal.Now.plainDateTimeISO()) {
    const body = objeto(value);
    const correoDestinatario = correoDTO(body.correoDestinatario);
    let fechaExpiracion = ahora.add({ days: 7 });
    if (body.fechaExpiracion != null) {
        try {
            if (typeof body.fechaExpiracion !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/.test(body.fechaExpiracion)) throw new Error();
            fechaExpiracion = Temporal.PlainDateTime.from(body.fechaExpiracion, { overflow: 'reject' });
        } catch { throw new BadRequestException('La fecha de expiración no es válida.'); }
    }
    if (Temporal.PlainDateTime.compare(fechaExpiracion, ahora) <= 0) throw new BadRequestException('La fecha de expiración debe ser posterior a la fecha actual.');
    if (Temporal.PlainDateTime.compare(fechaExpiracion, ahora.add({ days: 30 })) > 0) throw new BadRequestException('El enlace no puede tener una vigencia mayor a 30 días.');
    return { correoDestinatario, fechaExpiracion };
}
export function enlaceId(value: string) {
    if (!/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw new BadRequestException('El identificador del enlace no es válido.');
    return BigInt(value);
}
export function nombre(usuario: { nombre?: string | null; apellido?: string | null } | null, fallback = 'Sin información') {
    return usuario ? `${usuario.nombre?.trim() ?? ''} ${usuario.apellido?.trim() ?? ''}`.trim() || fallback : fallback;
}
export function urlCompartida(token: string) {
    const base = (process.env['FRONTEND_URL']?.trim() || 'http://localhost:8081').replace(/\/+$/, '');
    return `${base}/ticket-compartido.html?token=${encodeURIComponent(token)}`;
}
