import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `custodial_wallets` table to store encrypted Stellar keypairs
 * for users who opted into the platform-managed custodial wallet at registration.
 *
 * Security note: The `encrypted_secret_key`, `iv`, `auth_tag`, and `argon2_params`
 * columns store AES-256-GCM encrypted data. The platform cannot decrypt the
 * private key without the user's plaintext password.
 */
export class CreateCustodialWallets1700000000021 implements MigrationInterface {
  name = 'CreateCustodialWallets1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the custodial_wallets table
    await queryRunner.query(`
      CREATE TABLE "custodial_wallets" (
        "id"                   UUID          NOT NULL DEFAULT gen_random_uuid(),
        "user_id"              UUID          NOT NULL,
        "public_key"           VARCHAR(56)   NOT NULL,
        "encrypted_secret_key" TEXT          NOT NULL,
        "iv"                   VARCHAR(24)   NOT NULL,
        "auth_tag"             VARCHAR(32)   NOT NULL,
        "argon2_params"        JSONB         NOT NULL,
        "created_at"           TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updated_at"           TIMESTAMP     NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_custodial_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custodial_wallets_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users" ("id")
          ON DELETE CASCADE
      )
    `);

    // Unique: one custodial wallet per user
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_custodial_wallets_user_id"
        ON "custodial_wallets" ("user_id")
    `);

    // Unique: each public key is unique across all custodial wallets
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_custodial_wallets_public_key"
        ON "custodial_wallets" ("public_key")
    `);

    // Add wallet_type enum + column to the users table
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_wallet_type_enum') THEN
          CREATE TYPE "user_wallet_type_enum" AS ENUM ('none', 'self-custody', 'custodial');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "wallet_type" "user_wallet_type_enum"
          NOT NULL DEFAULT 'none'
    `);

    // Back-fill existing users who already have a stellar_address as 'self-custody'
    await queryRunner.query(`
      UPDATE "users"
        SET "wallet_type" = 'self-custody'
        WHERE "stellar_address" IS NOT NULL
          AND "wallet_type" = 'none'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_wallet_type_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_custodial_wallets_public_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_custodial_wallets_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custodial_wallets"`);
  }
}
