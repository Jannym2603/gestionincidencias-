import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class TiposIncidenciaService {
  async findAll() {
    return db.orm.public.TiposIncidencia.all();
  }
}