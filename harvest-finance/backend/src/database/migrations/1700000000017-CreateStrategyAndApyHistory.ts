import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateStrategyAndApyHistory1700000000017 implements MigrationInterface {
  name = 'CreateStrategyAndApyHistory1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Strategies table ─────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'strategies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'compounding_frequency',
            type: 'enum',
            enum: ['daily', 'weekly', 'monthly'],
            default: "'daily'",
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
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

    // ─── Vaults: add strategy_id column ──────────────────────────────────────
    await queryRunner.addColumn(
      'vaults',
      new Table({
        name: 'strategy_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // ─── Vault APY History table ──────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'vault_apy_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'vault_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'apy',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'snapshot_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ─── Foreign keys ─────────────────────────────────────────────────────────

    await queryRunner.createForeignKey(
      'vaults',
      new TableForeignKey({
        columnNames: ['strategy_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'strategies',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'vault_apy_history',
      new TableForeignKey({
        columnNames: ['vault_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vaults',
        onDelete: 'CASCADE',
      }),
    );

    // ─── Indexes ──────────────────────────────────────────────────────────────

    await queryRunner.createIndex(
      'strategies',
      new TableIndex({
        name: 'idx_strategies_compounding_frequency',
        columnNames: ['compounding_frequency'],
      }),
    );

    await queryRunner.createIndex(
      'vaults',
      new TableIndex({
        name: 'idx_vaults_strategy_id',
        columnNames: ['strategy_id'],
      }),
    );

    await queryRunner.createIndex(
      'vault_apy_history',
      new TableIndex({
        name: 'idx_vault_apy_history_vault_id',
        columnNames: ['vault_id'],
      }),
    );

    await queryRunner.createIndex(
      'vault_apy_history',
      new TableIndex({
        name: 'idx_vault_apy_history_snapshot_date',
        columnNames: ['snapshot_date'],
      }),
    );

    await queryRunner.createIndex(
      'vault_apy_history',
      new TableIndex({
        name: 'idx_vault_apy_history_vault_date',
        columnNames: ['vault_id', 'snapshot_date'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.dropTable('vault_apy_history', true);
    await queryRunner.dropColumn('vaults', 'strategy_id');
    await queryRunner.dropTable('strategies', true);
  }
}
