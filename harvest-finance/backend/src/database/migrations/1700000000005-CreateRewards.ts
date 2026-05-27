import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRewards1700000000005 implements MigrationInterface {
  name = 'CreateRewards1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reward_status_enum" AS ENUM ('ACCRUING', 'CLAIMED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "rewards" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "user_id" character varying NOT NULL,
        "vault_id" character varying NOT NULL,
        "deposit_id" character varying NOT NULL,
        "accrued_amount" numeric(18,8) NOT NULL DEFAULT 0,
        "status" "reward_status_enum" NOT NULL DEFAULT 'ACCRUING',
        "claimed_at" TIMESTAMP WITH TIME ZONE,
        "last_calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "pk_rewards" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_rewards_user" ON "rewards" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rewards_vault" ON "rewards" ("vault_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rewards_status" ON "rewards" ("status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_rewards_status"`);
    await queryRunner.query(`DROP INDEX "idx_rewards_vault"`);
    await queryRunner.query(`DROP INDEX "idx_rewards_user"`);
    await queryRunner.query(`DROP TABLE "rewards"`);
    await queryRunner.query(`DROP TYPE "reward_status_enum"`);
  }
}
