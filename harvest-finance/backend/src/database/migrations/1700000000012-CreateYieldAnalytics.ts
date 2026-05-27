import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateYieldAnalytics1700000000012 implements MigrationInterface {
  name = 'CreateYieldAnalytics1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'yield_analytics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'contract_id',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'total_assets',
            type: 'decimal',
            precision: 36,
            scale: 18,
            default: 0,
          },
          {
            name: 'total_shares',
            type: 'decimal',
            precision: 36,
            scale: 18,
            default: 0,
          },
          {
            name: 'hardwork_events_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'seven_day_apy',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'daily_apy',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'price_per_share',
            type: 'decimal',
            precision: 36,
            scale: 18,
            default: 0,
          },
          {
            name: 'price_per_share_previous',
            type: 'decimal',
            precision: 36,
            scale: 18,
            isNullable: true,
          },
          {
            name: 'volume_24h',
            type: 'decimal',
            precision: 36,
            scale: 18,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_yield_analytics_contract" ON "yield_analytics" ("contract_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_yield_analytics_date" ON "yield_analytics" ("date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_yield_analytics_7day_apy" ON "yield_analytics" ("seven_day_apy")`,
    );

    // Create unique constraint for contract_id + date
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_yield_analytics_contract_date" ON "yield_analytics" ("contract_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('yield_analytics');
  }
}
