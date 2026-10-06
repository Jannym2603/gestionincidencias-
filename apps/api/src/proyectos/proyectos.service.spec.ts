import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosService } from './proyectos.service.js';
import { AccesoProyectoService } from '../security/acceso-proyecto.service.js';

describe('ProyectosService', () => {
  let service: ProyectosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProyectosService, AccesoProyectoService],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
