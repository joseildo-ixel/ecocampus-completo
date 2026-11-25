import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjetosService } from './objetos.service';
import { Objeto } from './entities/objeto.entity';

describe('ObjetosService', () => {
  let service: ObjetosService;
  let objeto: Objeto | null;

  beforeEach(async () => {
    objeto = null;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjetosService,
        { provide: getRepositoryToken(Objeto), useValue: { findOneBy: async () => objeto } },
      ],
    }).compile();

    service = module.get<ObjetosService>(ObjetosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('includes the patrimonial flag in the object response', async () => {
    objeto = {
      id: 'object-id',
      nome: 'Notebook',
      descricao: 'Equipamento patrimonial',
      tipo: 'eletrônico',
      pesoKg: 2,
      pertencePatrimonio: true,
      ativo: true,
      dataCriacao: new Date(),
      itensDescarte: [],
    };

    await expect(service.findOne(objeto.id)).resolves.toMatchObject({
      pertencePatrimonio: true,
    });
  });
});
