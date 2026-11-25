import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createPageResponse } from '../common/dto/page-query.dto';
import { DescarteStatus } from '../common/enums/descarte-status.enum';
import { Descarte } from '../Descarte/entities/descarte.entity';
import { ColetorResponseDto } from './dto/coletor-response.dto';
import { CreateColetorDto } from './dto/create-coletor.dto';
import { ListColetoresQueryDto } from './dto/list-coletores-query.dto';
import { UpdateColetorDto } from './dto/update-coletor.dto';
import { Coletor } from './entities/coletor.entity';

@Injectable()
export class ColetorService {
  constructor(
    @InjectRepository(Coletor)
    private readonly coletores: Repository<Coletor>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateColetorDto): Promise<ColetorResponseDto> {
    const coletor = await this.coletores.save(
      this.coletores.create({
        ...dto,
        capacidadeMaxima: dto.capacidadeMaxima ?? 30,
        volumeAtual: 0,
      }),
    );
    return this.toResponse(coletor);
  }

  async findAll(query: ListColetoresQueryDto) {
    const { page, limit } = query;
    const builder = this.coletores.createQueryBuilder('coletor');
    if (query.localizacao) {
      builder.andWhere('coletor.localizacao ILIKE :localizacao', {
        localizacao: `%${query.localizacao}%`,
      });
    }
    if (query.ativo !== undefined) {
      builder.andWhere('coletor.ativo = :ativo', { ativo: query.ativo });
    }
    const [coletores, total] = await builder
      .orderBy('coletor.dataCriacao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return createPageResponse(
      coletores.map((coletor) => this.toResponse(coletor)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<ColetorResponseDto> {
    const coletor = await this.coletores.findOneBy({ id });
    if (!coletor) {
      throw new NotFoundException(`Coletor ${id} não encontrado`);
    }
    return this.toResponse(coletor);
  }

  async update(
    id: string,
    dto: UpdateColetorDto,
  ): Promise<ColetorResponseDto> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const coletores = manager.getRepository(Coletor);
      const coletor = await coletores.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coletor) {
        throw new NotFoundException(`Coletor ${id} não encontrado`);
      }
      const capacidadeMaxima = dto.capacidadeMaxima ?? coletor.capacidadeMaxima;
      if (Number(capacidadeMaxima) > 30 || Number(capacidadeMaxima) < 1) {
        throw new BadRequestException(
          'A capacidade máxima do coletor deve estar entre 1 e 30 itens',
        );
      }
      if (Number(coletor.volumeAtual) > Number(capacidadeMaxima)) {
        throw new BadRequestException(
          'A capacidade máxima não pode ser menor que a quantidade atual de itens',
        );
      }
      const coletorSalvo = await coletores.save(coletores.merge(coletor, dto));
      if (Number(coletorSalvo.volumeAtual) >= Number(coletorSalvo.capacidadeMaxima) * 0.8) {
        console.warn(`⚠️ ALERTA CINFRA: A Lixeira ${coletorSalvo.id} atingiu 80% ou mais da sua capacidade!`);
      }
      return coletorSalvo;
    });
    return this.toResponse(updated);
  }

  async adicionarItens(
    id: string,
    quantidade: number,
  ): Promise<ColetorResponseDto> {
    if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > 30) {
      throw new BadRequestException(
        'A quantidade adicionada deve ser um número inteiro entre 1 e 30',
      );
    }
    const updated = await this.dataSource.transaction(async (manager) => {
      const coletores = manager.getRepository(Coletor);
      const coletor = await coletores.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coletor) {
        throw new NotFoundException(`Coletor ${id} não encontrado`);
      }
      const volumeAtual = Number(coletor.volumeAtual);
      const capacidade = Number(coletor.capacidadeMaxima);
      if (volumeAtual + quantidade > capacidade) {
        throw new BadRequestException(
          'A quantidade excede a capacidade máxima de itens do coletor (máximo de 30 itens).',
        );
      }
      coletor.volumeAtual = volumeAtual + quantidade;
      const coletorSalvo = await coletores.save(coletor);

      if (Number(coletorSalvo.volumeAtual) >= Number(coletorSalvo.capacidadeMaxima) * 0.8) {
        console.warn(`⚠️ ALERTA CINFRA: A Lixeira ${coletorSalvo.id} atingiu 80% ou mais da sua capacidade!`);
      }

      return coletorSalvo;
    });
    return this.toResponse(updated);
  }

  async resetar(id: string): Promise<ColetorResponseDto> {
    const updated = await this.dataSource.transaction(async (manager) => {
      const coletores = manager.getRepository(Coletor);
      const coletor = await coletores.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coletor) {
        throw new NotFoundException(`Coletor ${id} não encontrado`);
      }
      await manager
        .getRepository(Descarte)
        .createQueryBuilder()
        .update()
        .set({ status: DescarteStatus.FINALIZADO })
        .where('"coletorId" = :id', { id })
        .andWhere('"status" != :status', { status: 'finalizado' })
        .execute();
      coletor.volumeAtual = 0;
      return coletores.save(coletor);
    });
    return this.toResponse(updated);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    const result = await this.coletores.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Coletor ${id} não encontrado`);
    }
    return { id, deleted: true };
  }

  private toResponse(coletor: Coletor): ColetorResponseDto {
    return {
      id: coletor.id,
      localizacao: coletor.localizacao,
      capacidadeMaxima: Number(coletor.capacidadeMaxima),
      volumeAtual: Number(coletor.volumeAtual),
      ativo: coletor.ativo,
      dataCriacao: coletor.dataCriacao,
    };
  }
}
