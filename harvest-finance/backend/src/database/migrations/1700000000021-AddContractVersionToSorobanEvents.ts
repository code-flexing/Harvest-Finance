import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds contract_version to soroban_events so each stored event records
 * the schema version that was active when the contract emitted it.
 * Existing rows are back-filled with 'v1' (the historical default).
 */
export class AddContractVersionToSorobanEvents1700000000021
  implements MigrationInterface
{
  name = 'AddContractVersionToSorobanEvents1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "soroban_events"
      ADD COLUMN IF NOT EXISTS "contract_version" varchar(32) NOT NULL DEFAULT 'v1'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_soroban_events_contract_version"
      ON "soroban_events" ("contract_version")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_soroban_events_contract_version"`,
    );
    await queryRunner.query(`
      ALTER TABLE "soroban_events" DROP COLUMN IF EXISTS "contract_version"
    `);
  }
}
