import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { createPageResponse } from '../common/dto/page-query.dto';
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from '../common/database-errors';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ListUsuariosQueryDto } from './dto/list-usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Usuario } from './entities/usuario.entity';
import { UsuarioRole } from '../common/enums/usuario-role.enum';

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

@Injectable()
export class UsuariosService implements OnModuleInit {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  async onModuleInit(): Promise<void> {
    const admin = await this.usuarios.findOneBy({ role: UsuarioRole.ADMIN });
    if (admin) return;
    await this.usuarios.save(
      this.usuarios.create({
        nome: 'Administrador EcoCampus',
        email: 'admin@ifpe.edu.br',
        senha: await hashPassword('Admin@123'),
        role: UsuarioRole.ADMIN,
        ativo: true,
      }),
    );
  }

  async login(email: string, password: string): Promise<UsuarioResponseDto> {
    const usuario = await this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.senha')
      .where('usuario.email = :email', { email })
      .getOne();
    if (!usuario || !usuario.ativo || !(await verifyPassword(password, usuario.senha))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.toResponse(usuario);
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    if (dto.tipo && dto.tipo !== UsuarioRole.USUARIO) {
      throw new BadRequestException('O auto-cadastro permite apenas o perfil usuario');
    }
    const senha = await hashPassword(dto.senha);
    const role = dto.tipo ? UsuarioRole.USUARIO : dto.role ?? UsuarioRole.USUARIO;
    try {
      const usuario = await this.usuarios.save(
        this.usuarios.create({
          nome: dto.nome,
          email: dto.email,
          matricula: dto.matricula?.trim() || null,
          senha,
          role,
          ativo: dto.ativo ?? true,
        }),
      );
      return this.toResponse(usuario);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
  }

  async findAll(query: ListUsuariosQueryDto) {
    const { page, limit } = query;
    const builder = this.usuarios.createQueryBuilder('usuario');

    if (query.nome) {
      builder.andWhere('usuario.nome ILIKE :nome', {
        nome: `%${query.nome}%`,
      });
    }
    if (query.email) {
      builder.andWhere('usuario.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }
    if (query.role) {
      builder.andWhere('usuario.role = :role', { role: query.role });
    }
    if (query.ativo !== undefined) {
      builder.andWhere('usuario.ativo = :ativo', { ativo: query.ativo });
    }

    const [usuarios, total] = await builder
      .orderBy('usuario.dataCriacao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return createPageResponse(
      usuarios.map((usuario) => this.toResponse(usuario)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string): Promise<UsuarioResponseDto> {
    const usuario = await this.usuarios.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return this.toResponse(usuario);
  }

  async update(
    id: string,
    dto: UpdateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.usuarios.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }

    const updates = { ...dto };
    if (updates.senha) {
      updates.senha = await hashPassword(updates.senha);
    }
    const normalizedUpdates = {
      ...updates,
      ...(dto.matricula === undefined
        ? {}
        : { matricula: dto.matricula.trim() || null }),
    };

    try {
      await this.usuarios.save(this.usuarios.merge(usuario, normalizedUpdates));
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw error;
    }
    return this.toResponse(await this.usuarios.findOneByOrFail({ id }));
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    try {
      const result = await this.usuarios.delete(id);
      if (!result.affected) {
        throw new NotFoundException(`Usuário ${id} não encontrado`);
      }
      return { id, deleted: true };
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Não é possível remover um usuário com descartes associados',
        );
      }
      throw error;
    }
  }

  private toResponse(usuario: Usuario): UsuarioResponseDto {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      matricula: usuario.matricula ?? null,
      role: usuario.role,
      ativo: usuario.ativo,
      dataCriacao: usuario.dataCriacao,
    };
  }
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash, extra] = storedHash.split(':');
  if (!salt || !hash || extra !== undefined || !/^[0-9a-f]{128}$/i.test(hash)) {
    return Promise.resolve(false);
  }
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(timingSafeEqual(derivedKey, Buffer.from(hash, 'hex')));
    });
  });
}
