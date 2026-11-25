import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUsuarioMatricula1000000000006
  implements MigrationInterface
{
  name = 'AddUsuarioMatricula1000000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'usuarios',
      new TableColumn({
        name: 'matricula',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('usuarios', 'matricula');
  }
}
