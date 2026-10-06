import { Test, TestingModule } from '@nestjs/testing';
import { SecurityModule } from '../security/security.module.js';
import { ProyectosController } from './proyectos.controller.js';
import { ProyectosService } from './proyectos.service.js';
import { AdministracionService } from '../administracion/administracion.service.js';

describe('ProyectosController', () => {
  let controller: ProyectosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [ProyectosController],
      providers: [{ provide: ProyectosService, useValue: { findAll: vi.fn() } }, { provide: AdministracionService, useValue: {} }],
    }).compile();

    controller = module.get<ProyectosController>(ProyectosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
