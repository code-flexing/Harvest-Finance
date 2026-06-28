import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateVaultReservations1700000000018 implements MigrationInterface {
  name = 'CreateVaultReservations1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vault_reservations',
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
            name: 'wallet_address',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'reserved_amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
        foreignKeys: [
          {
            columnNames: ['vault_id'],
            referencedTableName: 'vaults',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'vault_reservations',
      new TableIndex({
        name: 'idx_vault_reservations_vault_id',
        columnNames: ['vault_id'],
      }),
    );

    await queryRunner.createIndex(
      'vault_reservations',
      new TableIndex({
        name: 'idx_vault_reservations_wallet_address',
        columnNames: ['wallet_address'],
      }),
    );

    await queryRunner.createIndex(
      'vault_reservations',
      new TableIndex({
        name: 'idx_vault_reservations_active',
        columnNames: ['vault_id', 'is_active', 'expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vault_reservations');
  }
}
