import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVaultFees1700000000019 implements MigrationInterface {
  name = 'AddVaultFees1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "entry_fee_bps" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "exit_fee_bps" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "performance_fee_bps" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "fee_address" text`);

    // Extend deposit_events event type enum to support fee collection entries
    await queryRunner.query(`ALTER TYPE "deposit_events_event_type_enum" ADD VALUE IF NOT EXISTS 'FEE_COLLECTED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vaults" DROP COLUMN IF EXISTS "entry_fee_bps"`);
    await queryRunner.query(`ALTER TABLE "vaults" DROP COLUMN IF EXISTS "exit_fee_bps"`);
    await queryRunner.query(`ALTER TABLE "vaults" DROP COLUMN IF EXISTS "performance_fee_bps"`);
    await queryRunner.query(`ALTER TABLE "vaults" DROP COLUMN IF EXISTS "fee_address"`);
    // Note: removing an enum value requires recreating the type; left intentionally for safety
  }
}
