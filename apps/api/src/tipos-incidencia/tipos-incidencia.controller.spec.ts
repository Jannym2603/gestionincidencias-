import { Test, TestingModule } from '@nestjs/testing';
import { TiposIncidenciaController } from './tipos-incidencia.controller.js';
import { TiposIncidenciaService } from './tipos-incidencia.service.js';
import { SecurityModule } from '../security/security.module.js';

describe('TiposIncidenciaController', () => {
  let controller: TiposIncidenciaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [TiposIncidenciaController],
      providers: [{ provide: TiposIncidenciaService, useValue: { findAll: vi.fn() } }],
    }).compile();

    controller = module.get<TiposIncidenciaController>(TiposIncidenciaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
