import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1700000000006 implements MigrationInterface {
  name = 'CreateNotifications1700000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'DEPOSIT',
        'WITHDRAWAL',
        'REWARD',
        'SYSTEM',
        'VAULT_CREATED',
        'LARGE_TRANSACTION',
        'ERROR'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid,
        "admin_only" boolean NOT NULL DEFAULT false,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "type" "notification_type_enum" NOT NULL DEFAULT 'SYSTEM',
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_admin_only" ON "notifications" ("admin_only")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_is_read" ON "notifications" ("is_read")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_notifications_is_read"`);
    await queryRunner.query(`DROP INDEX "idx_notifications_admin_only"`);
    await queryRunner.query(`DROP INDEX "idx_notifications_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
