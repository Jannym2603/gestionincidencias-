import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';
import { objeto, texto } from '../tickets/tickets.dto.js';

export const MENSAJE_RECUPERACION = 'Si el correo esta registrado, recibiras un codigo de recuperacion.';
export const MENSAJE_PASSWORD = 'Contrasena actualizada correctamente.';
export const MAX_INTENTOS = 5;
export const MINUTOS_EXPIRACION = 10;
// Semántica de @Email de Hibernate Validator: partes locales de hasta 64 caracteres,
// átomos separados por puntos, comillas e IP literales; no admite puntos vacíos ni finales.
const ATOMO = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uFFFF-]";
const COMILLAS = '"(?:[a-z0-9!#$%&\'*.(),<>\\[\\]:;  @+/=?^_`{|}~\\u0080-\\uFFFF-]|\\\\[\\\\"])+"';
const LOCAL = new RegExp(`^(?:${ATOMO}+|${COMILLAS})(?:\\.(?:${ATOMO}+|${COMILLAS}))*$`, 'i');
const ETIQUETA = "[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uFFFF]+(?:-+[a-z0-9!#$%&'*+/=?^_`{|}~\\u0080-\\uFFFF]+)*";
const DOMINIO = new RegExp(`^${ETIQUETA}(?:\\.${ETIQUETA})*$`, 'i');
function emailValido(email: string) {
    const separador = email.lastIndexOf('@');
    if (separador < 0) return false;
    const local = email.slice(0, separador), dominio = email.slice(separador + 1);
    if (local.length > 64 || !LOCAL.test(local) || dominio.endsWith('.')) return false;
    if (/^\[\d{1,3}(?:\.\d{1,3}){3}\]$/.test(dominio)) return true;
    if (/^\[IPv6:/i.test(dominio) && dominio.endsWith(']')) return isIP(dominio.slice(6, -1)) === 6;
    const ascii = domainToASCII(dominio);
    return DOMINIO.test(dominio) && !!ascii && ascii.length <= 255 && ascii.split('.').every((s) => s.length <= 63);
}
export function correoDTO(value: unknown): string {
    const correo = texto(value, 'correo', 150);
    if (!emailValido(value as string)) throw new BadRequestException('El correo no tiene un formato valido.');
    return correo.toLowerCase();
}
export function nuevaPasswordDTO(value: unknown): string {
    const password = texto(value, 'nuevaPassword');
    if (password.length < 6) throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres.');
    // Spring BCrypt rechaza más de 72 bytes; node-bcrypt los truncaría silenciosamente.
    if (Buffer.byteLength(password, 'utf8') > 72) throw new BadRequestException('La nueva contraseña no puede superar 72 bytes UTF-8.');
    return password;
}
export function passwordEntrada(value: unknown): string {
    const password = texto(value, 'nuevaPassword');
    // @Size se ejecuta sobre el valor original; la regla de negocio valida después de trim.
    if ((value as string).length < 6) throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres.');
    return password;
}
export function loginDTO(value: unknown) {
    const body = objeto(value);
    return { correo: correoDTO(body.correo), password: texto(body.password, 'password') };
}
export function generarCodigo(): string { return String(randomInt(1000000)).padStart(6, '0'); }
export const esBCrypt = (hash: string) => /^\$2[aby]\$/.test(hash);
export async function coincide(valor: string, guardado: string | null | undefined, permitirLegado = true): Promise<boolean> {
    if (!guardado?.trim()) return false;
    if (esBCrypt(guardado)) {
        // Spring conserva la comparación de contraseñas antiguas largas; el límite aplica al codificar nuevas.
        return bcrypt.compare(valor, guardado.replace(/^\$2y\$/, '$2b$'));
    }
    if (!permitirLegado) return false;
    const a = Buffer.from(valor), b = Buffer.from(guardado);
    return a.length === b.length && timingSafeEqual(a, b);
}
export const codificar = (valor: string) => bcrypt.hash(valor, 10);
