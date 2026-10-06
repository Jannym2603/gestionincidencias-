import { Test, TestingModule } from '@nestjs/testing';
import { CompaniasService } from './companias.service.js';

describe('CompaniasService', () => {
  let service: CompaniasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniasService],
    }).compile();

    service = module.get<CompaniasService>(CompaniasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
