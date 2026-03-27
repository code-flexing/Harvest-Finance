import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAchievements1700000000004 implements MigrationInterface {
  name = 'CreateAchievements1700000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "achievement_type_enum" AS ENUM (
        'FIRST_DEPOSIT',
        'CONSISTENT_SAVER',
        'MILESTONE_MASTER',
        'LONG_TERM_PLANNER'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "achievements" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" character varying NOT NULL,
        "type" "achievement_type_enum" NOT NULL,
        "unlocked_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "meta_data" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "pk_achievements" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_achievements_user" ON "achievements" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_achievements_type" ON "achievements" ("type")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_achievements_type"`);
    await queryRunner.query(`DROP INDEX "idx_achievements_user"`);
    await queryRunner.query(`DROP TABLE "achievements"`);
    await queryRunner.query(`DROP TYPE "achievement_type_enum"`);
  }
}
