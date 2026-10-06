import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller.js';
import { AdministracionService } from '../administracion/administracion.service.js';
import { SecurityModule } from '../security/security.module.js';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: AdministracionService, useValue: { usuarios: vi.fn() } }],
      imports: [SecurityModule],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
