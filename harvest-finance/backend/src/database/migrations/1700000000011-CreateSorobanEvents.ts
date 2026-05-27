import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSorobanEvents1700000000011 implements MigrationInterface {
  name = 'CreateSorobanEvents1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'soroban_events_type_enum') THEN
           CREATE TYPE "soroban_events_type_enum" AS ENUM ('contract', 'system', 'diagnostic');
         END IF;
       END $$;`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'soroban_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_id',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'soroban_events_type_enum',
            default: "'contract'",
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'ledger',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'ledger_closed_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'transaction_hash',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'paging_token',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'topics',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'in_successful_contract_call',
            type: 'boolean',
            default: true,
          },
          {
            name: 'indexed_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_soroban_events_event_id" ON "soroban_events" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_soroban_events_contract" ON "soroban_events" ("contract_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_soroban_events_ledger" ON "soroban_events" ("ledger")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_soroban_events_tx" ON "soroban_events" ("transaction_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('soroban_events');
    await queryRunner.query(`DROP TYPE IF EXISTS "soroban_events_type_enum"`);
  }
}
