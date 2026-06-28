import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexerState1700000000019 implements MigrationInterface {
  name = 'CreateIndexerState1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "indexer_state" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contract_id" varchar(128) NOT NULL,
        "last_cursor" varchar(128) NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_indexer_state" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_indexer_state_contract" ON "indexer_state" ("contract_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_indexer_state_contract"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "indexer_state"`);
  }
}
