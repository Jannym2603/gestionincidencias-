import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class UsuariosService {
  async findAll() {
    const usuarios = await db.orm.public.Usuarios.all();

    return usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono,
      estado: usuario.estado,
      fechaCreacion: usuario.fechaCreacion,
    }));
  }
}