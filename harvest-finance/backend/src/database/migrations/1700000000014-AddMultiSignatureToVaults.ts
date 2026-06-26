import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiSignatureToVaults1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vaults 
        ADD COLUMN requires_multi_signature BOOLEAN DEFAULT FALSE,
        ADD COLUMN approval_threshold INTEGER DEFAULT 1,
        ADD COLUMN current_approvals INTEGER DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vaults 
        DROP COLUMN requires_multi_signature,
        DROP COLUMN approval_threshold,
        DROP COLUMN current_approvals`,
    );
  }
}
