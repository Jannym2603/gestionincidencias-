import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class RolesService {
  async findAll() {
    return db.orm.public.Roles.all();
  }
}