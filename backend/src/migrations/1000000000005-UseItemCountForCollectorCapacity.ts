import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseItemCountForCollectorCapacity1000000000005
  implements MigrationInterface
{
  name = 'UseItemCountForCollectorCapacity1000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "coletores" coletor
      SET "volumeAtual" = COALESCE((
        SELECT SUM(COALESCE((
          SELECT SUM(item."quantidade")
          FROM "itens_descarte" item
          WHERE item."descarteId" = descarte."id"
        ), 1))
        FROM "descartes" descarte
        WHERE descarte."coletorId" = coletor."id"
          AND descarte."status" <> 'finalizado'
      ), 0)
    `);
    await queryRunner.query(`
      UPDATE "coletores"
      SET "capacidadeMaxima" = LEAST(30, GREATEST(1, CEIL("capacidadeMaxima")))
    `);
    await queryRunner.query(`
      ALTER TABLE "coletores"
        ALTER COLUMN "capacidadeMaxima" TYPE integer USING ROUND("capacidadeMaxima")::integer,
        ALTER COLUMN "volumeAtual" TYPE integer USING ROUND("volumeAtual")::integer,
        ALTER COLUMN "capacidadeMaxima" SET DEFAULT 30
    `);
    await queryRunner.query(`
      ALTER TABLE "descartes"
        ALTER COLUMN "pesoKg" SET DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coletores"
        ALTER COLUMN "capacidadeMaxima" DROP DEFAULT,
        ALTER COLUMN "volumeAtual" TYPE numeric(10,2) USING "volumeAtual"::numeric(10,2),
        ALTER COLUMN "capacidadeMaxima" TYPE numeric(10,2) USING "capacidadeMaxima"::numeric(10,2),
        ALTER COLUMN "capacidadeMaxima" SET DEFAULT 100
    `);
    await queryRunner.query(`
      ALTER TABLE "descartes"
        ALTER COLUMN "pesoKg" DROP DEFAULT
    `);
  }
}
