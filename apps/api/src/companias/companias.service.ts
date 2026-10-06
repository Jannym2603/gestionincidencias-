import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class CompaniasService {
  async findAll() {
    return db.orm.public.Companias.all();
  }
}