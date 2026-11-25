import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService authentication', () => {
  let service: UsuariosService;
  let records: Usuario[];
  let repository: Repository<Usuario>;

  beforeEach(() => {
    records = [];
    const queryBuilder = {
      addSelect: vi.fn(),
      where: vi.fn(),
      getOne: vi.fn(),
    };
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockImplementation((_condition, params: { email: string }) => {
      queryBuilder.getOne.mockResolvedValue(
        records.find((usuario) => usuario.email === params.email) ?? null,
      );
      return queryBuilder;
    });

    repository = {
      create: vi.fn((values) => values as Usuario),
      save: vi.fn(async (usuario: Usuario) => {
        const saved = {
          ...usuario,
          id: usuario.id ?? randomUUID(),
          dataCriacao: usuario.dataCriacao ?? new Date(),
        };
        records.push(saved);
        return saved;
      }),
      findOneBy: vi.fn(async (criteria) =>
        records.find((usuario) =>
          Object.entries(criteria).every(([key, value]) => usuario[key as keyof Usuario] === value),
        ) ?? null,
      ),
      createQueryBuilder: vi.fn(() => queryBuilder),
    } as unknown as Repository<Usuario>;
    service = new UsuariosService(repository);
  });

  it('seeds the demo administrator and returns the user without password', async () => {
    await service.onModuleInit();

    const user = await service.login('admin@ifpe.edu.br', 'Admin@123');
    expect(user.email).toBe('admin@ifpe.edu.br');
    expect(user.role).toBe('admin');
    expect(user).not.toHaveProperty('senha');
  });

  it('rejects invalid credentials and inactive users', async () => {
    await service.onModuleInit();
    await expect(service.login('admin@ifpe.edu.br', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    records[0].ativo = false;
    await expect(service.login('admin@ifpe.edu.br', 'Admin@123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
