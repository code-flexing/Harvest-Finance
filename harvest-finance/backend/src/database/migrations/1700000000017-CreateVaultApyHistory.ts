import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateVaultApyHistory1700000000017 implements MigrationInterface {
  name = 'CreateVaultApyHistory1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add compounding_frequency column to vaults
    await queryRunner.query(
      `ALTER TABLE "vaults" ADD COLUMN "compounding_frequency" varchar(20) NOT NULL DEFAULT 'daily'`,
    );

    // Create vault_apy_history table
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
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'apy',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true, // ifNotExists
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'vault_apy_history',
      new TableForeignKey({
        columnNames: ['vault_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'vaults',
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      'vault_apy_history',
      new TableIndex({
        name: 'idx_vault_apy_history_vault',
        columnNames: ['vault_id'],
      }),
    );

    await queryRunner.createIndex(
      'vault_apy_history',
      new TableIndex({
        name: 'idx_vault_apy_history_date',
        columnNames: ['date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vault_apy_history', true);
    await queryRunner.query(`ALTER TABLE "vaults" DROP COLUMN "compounding_frequency"`);
  }
}
