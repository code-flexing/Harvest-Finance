import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuspendedVaultStatusAndStellarAccount1700000000018
  implements MigrationInterface
{
  name = 'AddSuspendedVaultStatusAndStellarAccount1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."vaults_status_enum" ADD VALUE IF NOT EXISTS 'SUSPENDED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "vaults" ADD COLUMN IF NOT EXISTS "stellar_account_address" varchar(56) DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vaults" DROP COLUMN IF EXISTS "stellar_account_address"`,
    );
    // Note: PostgreSQL does not support DROP VALUE from an enum type.
    // To roll back the SUSPENDED value, recreate the enum without it.
  }
}
