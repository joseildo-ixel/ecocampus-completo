import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UsuarioRole } from '../../common/enums/usuario-role.enum';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  senha: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  matricula?: string;

  @IsOptional()
  @IsEnum(UsuarioRole)
  role?: UsuarioRole;

  @IsOptional()
  @IsEnum(UsuarioRole)
  tipo?: UsuarioRole;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
