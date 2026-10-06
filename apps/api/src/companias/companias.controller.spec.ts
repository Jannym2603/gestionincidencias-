import { Test, TestingModule } from '@nestjs/testing';
import { SecurityModule } from '../security/security.module.js';
import { CompaniasController } from './companias.controller.js';
import { AdministracionService } from '../administracion/administracion.service.js';

describe('CompaniasController', () => {
  let controller: CompaniasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SecurityModule],
      controllers: [CompaniasController],
      providers: [{ provide: AdministracionService, useValue: { companias: vi.fn() } }],
    }).compile();

    controller = module.get<CompaniasController>(CompaniasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
