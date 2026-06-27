import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVaultApprovals1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE vault_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        comment TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE vault_approvals`);
  }
}
