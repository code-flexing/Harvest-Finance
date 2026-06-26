import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLoginLockout1700000000020 implements MigrationInterface {
  name = 'AddUserLoginLockout1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP WITH TIME ZONE DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "locked_until"`,
    );
  }
}
