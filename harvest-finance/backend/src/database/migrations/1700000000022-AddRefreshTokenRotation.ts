import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds refresh-token rotation support to the `sessions` table and creates
 * the `security_events` audit-log table.
 *
 * sessions changes:
 *  - family_id  uuid NOT NULL  — groups all tokens issued from a single login
 *  - is_revoked boolean NOT NULL DEFAULT false
 *  - replaced_by uuid NULL     — UUID of the successor session row after rotation
 *
 * security_events:
 *  - Immutable append-only audit log for security-sensitive events.
 */
export class AddRefreshTokenRotation1700000000022 implements MigrationInterface {
  name = 'AddRefreshTokenRotation1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── sessions: add rotation columns ───────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "sessions"
        ADD COLUMN IF NOT EXISTS "family_id"   uuid    NOT NULL DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS "is_revoked"  boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "replaced_by" uuid    NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sessions_family_id"
        ON "sessions" ("family_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sessions_user_id_revoked"
        ON "sessions" ("user_id", "is_revoked")
    `);

    // ── security_events: audit log ────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "security_events_type_enum" AS ENUM (
          'REFRESH_TOKEN_REUSE',
          'SESSION_REVOKED',
          'ALL_SESSIONS_REVOKED',
          'ACCOUNT_LOCKED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "security_events" (
        "id"         uuid             NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    uuid             NULL,
        "type"       "security_events_type_enum" NOT NULL,
        "message"    text             NOT NULL,
        "metadata"   jsonb            NULL,
        "created_at" TIMESTAMP        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_security_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_security_events_user"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_events_user_id"
        ON "security_events" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_events_type"
        ON "security_events" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_security_events_created_at"
        ON "security_events" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // security_events
    await queryRunner.query(`DROP TABLE IF EXISTS "security_events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "security_events_type_enum"`);

    // sessions rotation columns
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_user_id_revoked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_family_id"`);
    await queryRunner.query(`
      ALTER TABLE "sessions"
        DROP COLUMN IF EXISTS "replaced_by",
        DROP COLUMN IF EXISTS "is_revoked",
        DROP COLUMN IF EXISTS "family_id"
    `);
  }
}
