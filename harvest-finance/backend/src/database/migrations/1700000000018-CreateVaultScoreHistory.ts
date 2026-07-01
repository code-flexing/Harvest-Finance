import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateVaultScoreHistory1700000000018 implements MigrationInterface {
  name = 'CreateVaultScoreHistory1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add strategy_score column to vaults table
    await queryRunner.addColumn(
      'vaults',
      new TableColumn({
        name: 'strategy_score',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // Create vault_score_history table
    await queryRunner.createTable(
      new Table({
        name: 'vault_score_history',
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
            name: 'strategy_score',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'apy_score',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'tvl_stability_score',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'drawdown_score',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'operator_score',
            type: 'int',
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

    // Add foreign key
    await queryRunner.createForeignKey(
      'vault_score_history',
      new TableForeignKey({
        columnNames: ['vault_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vaults',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      'vault_score_history',
      new TableIndex({
        name: 'idx_vault_score_history_vault_id',
        columnNames: ['vault_id'],
      }),
    );

    await queryRunner.createIndex(
      'vault_score_history',
      new TableIndex({
        name: 'idx_vault_score_history_snapshot_date',
        columnNames: ['snapshot_date'],
      }),
    );

    await queryRunner.createIndex(
      'vault_score_history',
      new TableIndex({
        name: 'idx_vault_score_history_vault_date',
        columnNames: ['vault_id', 'snapshot_date'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vault_score_history', true);
    await queryRunner.dropColumn('vaults', 'strategy_score');
  }
}