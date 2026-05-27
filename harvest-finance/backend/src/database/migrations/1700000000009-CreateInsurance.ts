import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInsurance1700000000009 implements MigrationInterface {
  name = 'CreateInsurance1700000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "insurance_plan_type_enum" AS ENUM (
        'CROP_YIELD',
        'WEATHER_INDEX',
        'MARKET_PRICE',
        'COMPREHENSIVE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_status_enum" AS ENUM (
        'ACTIVE',
        'EXPIRED',
        'CANCELLED',
        'PENDING'
      )
    `);

    // ── insurance_plans ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "insurance_plans" (
        "id"                       uuid          DEFAULT gen_random_uuid() NOT NULL,
        "name"                     varchar(120)  NOT NULL,
        "description"              text,
        "plan_type"                "insurance_plan_type_enum" NOT NULL,
        "applicable_risk_levels"   text          NOT NULL,
        "applicable_crops"         text,
        "premium_rate"             decimal(6,4)  NOT NULL,
        "coverage_multiplier"      decimal(4,2)  NOT NULL DEFAULT 1.0,
        "provider_name"            varchar(120)  NOT NULL,
        "provider_contact"         varchar(200),
        "is_active"                boolean       NOT NULL DEFAULT true,
        "created_at"               TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at"               TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "pk_insurance_plans" PRIMARY KEY ("id")
      )
    `);

    // ── insurance_subscriptions ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "insurance_subscriptions" (
        "id"                          uuid          DEFAULT gen_random_uuid() NOT NULL,
        "user_id"                     uuid          NOT NULL,
        "plan_id"                     uuid          NOT NULL,
        "crop_type"                   varchar(60)   NOT NULL,
        "insured_value"               decimal(18,2) NOT NULL,
        "monthly_premium"             decimal(18,2) NOT NULL,
        "status"                      "subscription_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "coverage_start"              date          NOT NULL,
        "coverage_end"                date          NOT NULL,
        "farm_vault_id"               uuid,
        "risk_score_at_subscription"  smallint      NOT NULL DEFAULT 0,
        "created_at"                  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at"                  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "pk_insurance_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ins_subs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ins_subs_plan" FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_ins_subs_user" ON "insurance_subscriptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ins_subs_plan" ON "insurance_subscriptions" ("plan_id")`,
    );

    // ── Seed default insurance plans ───────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "insurance_plans"
        ("name", "description", "plan_type", "applicable_risk_levels",
         "applicable_crops", "premium_rate", "coverage_multiplier",
         "provider_name", "provider_contact")
      VALUES
        (
          'Basic Crop Yield Protection',
          'Compensates for yield shortfalls caused by natural disasters, pest damage, or disease. Best for farmers with moderate weather exposure.',
          'CROP_YIELD',
          'LOW,MEDIUM',
          NULL,
          0.0250,
          0.70,
          'AgriShield Insurance',
          'support@agrishield.example.com'
        ),
        (
          'Weather Index Guard',
          'Index-based payout triggered automatically when temperature or rainfall deviates beyond defined thresholds – no loss adjustment needed.',
          'WEATHER_INDEX',
          'MEDIUM,HIGH',
          NULL,
          0.0350,
          0.80,
          'ClimateGuard Mutual',
          'claims@climateguard.example.com'
        ),
        (
          'Market Price Stabiliser',
          'Covers revenue loss when commodity prices fall more than 20 % below the contracted reference price at harvest.',
          'MARKET_PRICE',
          'LOW,MEDIUM,HIGH',
          'MAIZE,WHEAT,SOYBEAN,COFFEE',
          0.0200,
          0.75,
          'FairPrice Re',
          'info@fairpricere.example.com'
        ),
        (
          'Comprehensive Farm Protect',
          'All-in-one coverage combining yield, weather, and market-price protection. Recommended for high-value or high-risk operations.',
          'COMPREHENSIVE',
          'HIGH,VERY_HIGH',
          NULL,
          0.0480,
          0.90,
          'HarvestSafe Partners',
          'enroll@harvestsafe.example.com'
        ),
        (
          'Smallholder Starter Plan',
          'Affordable entry-level plan for small farms. Covers catastrophic yield loss (> 50 % shortfall) at a low annual premium.',
          'CROP_YIELD',
          'LOW,MEDIUM,HIGH',
          NULL,
          0.0150,
          0.50,
          'AgriShield Insurance',
          'support@agrishield.example.com'
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_ins_subs_plan"`);
    await queryRunner.query(`DROP INDEX "idx_ins_subs_user"`);
    await queryRunner.query(`DROP TABLE "insurance_subscriptions"`);
    await queryRunner.query(`DROP TABLE "insurance_plans"`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE "insurance_plan_type_enum"`);
  }
}
