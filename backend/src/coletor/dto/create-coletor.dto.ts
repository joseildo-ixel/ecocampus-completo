import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateColetorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  localizacao: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(30)
  capacidadeMaxima?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}