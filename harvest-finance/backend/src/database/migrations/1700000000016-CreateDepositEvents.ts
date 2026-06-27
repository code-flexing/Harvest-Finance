import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateDepositEvents1700000000016 implements MigrationInterface {
  name = 'CreateDepositEvents1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_events_event_type_enum') THEN
           CREATE TYPE "deposit_events_event_type_enum" AS ENUM ('INITIATED', 'CONFIRMED', 'FAILED', 'REFUNDED');
         END IF;
       END $$;`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'deposit_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'deposit_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'vault_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'deposit_events_event_type_enum',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'transaction_hash',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'stellar_transaction_id',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'occurred_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_deposit_events_deposit" ON "deposit_events" ("deposit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deposit_events_user" ON "deposit_events" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deposit_events_vault" ON "deposit_events" ("vault_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deposit_events_type" ON "deposit_events" ("event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_deposit_events_occurred_at" ON "deposit_events" ("occurred_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deposit_events');
    await queryRunner.query(
      `DROP TYPE IF EXISTS "deposit_events_event_type_enum"`,
    );
  }
}
