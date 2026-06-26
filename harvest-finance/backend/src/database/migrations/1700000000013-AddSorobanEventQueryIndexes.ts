import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSorobanEventQueryIndexes1700000000013 implements MigrationInterface {
  name = 'AddSorobanEventQueryIndexes1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_soroban_events_type" ON "soroban_events" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_soroban_events_query" ON "soroban_events" ("contract_id", "type", "ledger" DESC, "paging_token" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_soroban_events_query"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_soroban_events_type"`);
  }
}
