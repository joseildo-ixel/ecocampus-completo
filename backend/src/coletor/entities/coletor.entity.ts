import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Descarte } from '../../Descarte/entities/descarte.entity';

@Entity('coletores')
export class Coletor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  localizacao: string;

  @Column({ type: 'integer', default: 30 })
  capacidadeMaxima: number;

  @Column({ type: 'integer', default: 0 })
  volumeAtual: number;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  dataCriacao: Date;

  @OneToMany(() => Descarte, (descarte) => descarte.coletor)
  descartes: Descarte[];
}
