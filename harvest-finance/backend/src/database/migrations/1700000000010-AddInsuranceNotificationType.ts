import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsuranceNotificationType1700000000010 implements MigrationInterface {
  name = 'AddInsuranceNotificationType1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'INSURANCE'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres enum value removal is non-trivial and intentionally omitted.
  }
}
