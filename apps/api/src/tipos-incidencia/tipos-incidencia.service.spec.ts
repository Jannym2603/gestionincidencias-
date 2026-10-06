import { Test, TestingModule } from '@nestjs/testing';
import { TiposIncidenciaService } from './tipos-incidencia.service.js';

describe('TiposIncidenciaService', () => {
  let service: TiposIncidenciaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TiposIncidenciaService],
    }).compile();

    service = module.get<TiposIncidenciaService>(TiposIncidenciaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
