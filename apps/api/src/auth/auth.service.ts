import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Temporal } from 'temporal-polyfill';
import { AuthRepository } from './auth.repository.js';
import type { AuthUsuario, CodigoNuevo } from './auth.repository.js';
import { codificar, coincide, correoDTO, esBCrypt, generarCodigo, MAX_INTENTOS, MENSAJE_PASSWORD,
    MENSAJE_RECUPERACION, MINUTOS_EXPIRACION, nuevaPasswordDTO, passwordEntrada } from './auth.rules.js';
import { objeto, texto } from '../tickets/tickets.dto.js';
import { NotificacionService } from '../notificaciones/notificacion.service.js';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(private readonly jwtService: JwtService, private readonly repo: AuthRepository,
        private readonly notificaciones: NotificacionService) {}
    private async passwordValida(repo: AuthRepository, usuario: AuthUsuario, password: string) {
        if (!await coincide(password, usuario.password)) return false;
        if (!esBCrypt(usuario.password)) {
            if (Buffer.byteLength(password, 'utf8') > 72) throw new BadRequestException('La contraseña no puede superar 72 bytes UTF-8.');
            const hash = await codificar(password);
            await repo.updatePassword(usuario.id, hash);
            usuario.password = hash as AuthUsuario['password'];
        }
        return true;
    }
    async login(correo: string, password: string) {
        const email = correoDTO(correo);
        const ingresada = texto(password, 'password');
        let usuario = await this.repo.findUsuario(email);
        if (!usuario) throw new BadRequestException('Correo no registrado.');
        if (usuario.estado !== true) throw new BadRequestException('Este usuario esta inactivo.');
        if (!esBCrypt(usuario.password)) {
            usuario = await this.repo.transaction(email, async (repo) => {
                const actual = await repo.findUsuario(email);
                if (!actual || actual.estado !== true || !await this.passwordValida(repo, actual, ingresada)) {
                    throw new BadRequestException('Contrasena incorrecta.');
                }
                return actual;
            });
        } else if (!await this.passwordValida(this.repo, usuario, ingresada)) throw new BadRequestException('Contrasena incorrecta.');
        const usuarioRol = await this.repo.findRol(usuario.id);
        if (!usuarioRol?.rol) throw new BadRequestException('El usuario no tiene rol asignado.');
        const rol = usuarioRol.rol.nombre;
        const token = await this.jwtService.signAsync({ sub: usuario.correo, usuarioId: usuario.id, rol });
        return { id: usuario.id, nombre: `${usuario.nombre} ${usuario.apellido}`, correo: usuario.correo, rol, token };
    }
    async cambiarPassword(value: unknown, sub: unknown) {
        if (typeof sub !== 'string' || !sub.trim()) throw new UnauthorizedException('El usuario autenticado no existe.');
        const correo = sub.trim().toLowerCase();
        const body = objeto(value);
        const actual = texto(body.passwordActual, 'passwordActual');
        const nueva = passwordEntrada(body.nuevaPassword);
        const error = await this.repo.transaction(correo, async (repo) => {
            const usuario = await repo.findUsuario(correo);
            if (!usuario) return new UnauthorizedException('El usuario autenticado no existe.');
            if (usuario.estado !== true) return new ForbiddenException('Este usuario esta inactivo.');
            if (!await this.passwordValida(repo, usuario, actual)) return new BadRequestException('La contraseña actual es incorrecta.');
            try { nuevaPasswordDTO(nueva); }
            catch (error) { if (error instanceof BadRequestException) return error; throw error; }
            if (await coincide(nueva, usuario.password, false)) return new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
            await repo.updatePassword(usuario.id, await codificar(nueva));
            return null;
        });
        if (error) throw error;
        return MENSAJE_PASSWORD;
    }
    async solicitarRecuperacion(value: unknown) {
        const correo = correoDTO(objeto(value).correo);
        const resultado = await this.repo.transaction(correo, async (repo) => {
            const usuario = await repo.findUsuario(correo);
            if (!usuario || usuario.estado !== true) return null;
            await repo.deleteCodigos(correo);
            const codigo = generarCodigo();
            const ahora = Temporal.Now.plainDateTimeISO();
            await repo.createCodigo({ correo, codigo: await codificar(codigo), fechaCreacion: ahora,
                fechaExpiracion: ahora.add({ minutes: MINUTOS_EXPIRACION }), usado: false, intentosFallidos: 0 } as CodigoNuevo);
            return { usuario, codigo };
        });
        if (resultado) {
            try { await this.notificaciones.notificarCodigoRecuperacionPassword(resultado.usuario, resultado.codigo); }
            catch { this.logger.warn('No se pudo enviar el correo de recuperación.'); }
        }
        return MENSAJE_RECUPERACION;
    }
    async confirmarRecuperacion(value: unknown) {
        const body = objeto(value);
        const correo = correoDTO(body.correo);
        const codigo = texto(body.codigo, 'codigo');
        const nueva = passwordEntrada(body.nuevaPassword);
        // Retornar errores y lanzarlos después del commit conserva intentos e invalidación.
        const error = await this.repo.transaction(correo, async (repo) => {
            const usuario = await repo.findUsuario(correo);
            if (!usuario || usuario.estado !== true) return 'Datos de recuperacion no validos.';
            const recuperacion = await repo.findCodigo(correo);
            if (!recuperacion) return 'No hay un codigo de recuperacion activo.';
            if (Temporal.PlainDateTime.compare(recuperacion.fechaExpiracion, Temporal.Now.plainDateTimeISO()) < 0) {
                await repo.updateCodigo(recuperacion.id, { usado: true });
                return 'El codigo de recuperacion expiro. Solicita uno nuevo.';
            }
            const intentos = recuperacion.intentosFallidos ?? 0;
            const bloqueado = 'El codigo fue bloqueado por demasiados intentos. Solicita uno nuevo.';
            if (intentos >= MAX_INTENTOS) {
                await repo.updateCodigo(recuperacion.id, { usado: true });
                return bloqueado;
            }
            if (!await coincide(codigo, recuperacion.codigo)) {
                const nuevos = intentos + 1;
                await repo.updateCodigo(recuperacion.id, { intentosFallidos: nuevos, usado: nuevos >= MAX_INTENTOS });
                return nuevos >= MAX_INTENTOS ? bloqueado : `El codigo de recuperacion no es valido. Intentos restantes: ${MAX_INTENTOS - nuevos}`;
            }
            try { nuevaPasswordDTO(nueva); }
            catch (error) { if (error instanceof BadRequestException) return error.message; throw error; }
            if (await coincide(nueva, usuario.password, false)) return 'La nueva contraseña debe ser diferente a la actual.';
            await repo.updatePassword(usuario.id, await codificar(nueva));
            await repo.updateCodigo(recuperacion.id, { usado: true });
            return null;
        });
        if (error) throw new BadRequestException(error);
        return MENSAJE_PASSWORD;
    }
}
