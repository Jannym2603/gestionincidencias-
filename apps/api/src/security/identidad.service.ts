import { Injectable, UnauthorizedException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthUsuario } from '../auth/auth.repository.js';
export const normalizarRol = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase().replace(/^ROLE_/, '') : '';
@Injectable()
export class IdentidadService {
    async resolver(claims: Record<string, unknown>) {
        if (typeof claims.sub !== 'string' || !claims.sub.trim() || !normalizarRol(claims.rol)) throw new UnauthorizedException('Token inválido.');
        const usuario = await db.orm.public.Usuarios.where((u) => u.correo.eq(claims.sub as AuthUsuario['correo'])).select('id', 'estado').first();
        if (!usuario) throw new UnauthorizedException('El usuario autenticado no existe.');
        const relacion = await db.orm.public.UsuarioRoles.where((r) => r.usuarioId.eq(usuario.id)).include('rol').first();
        const rol = normalizarRol(relacion?.rol.nombre);
        // Una sesión con identidad/rol obsoleto debe renovarse para retirar privilegios antiguos.
        if (!usuario.estado || !rol || (claims.usuarioId != null && claims.usuarioId !== usuario.id) || normalizarRol(claims.rol) !== rol) throw new UnauthorizedException('La sesión debe renovarse.');
        return { ...claims, usuarioId: usuario.id, rol };
    }
}
