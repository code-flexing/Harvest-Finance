import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateInsuranceClaims1700000000013 implements MigrationInterface {
  name = 'CreateInsuranceClaims1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'insurance_claims',
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
            name: 'depositor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'loss_amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'payout_amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'],
            default: "'PENDING'",
          },
          {
            name: 'transaction_hash',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
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
            name: 'fk_insurance_claims_vault',
            columnNames: ['vault_id'],
            referencedTableName: 'vaults',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'fk_insurance_claims_depositor',
            columnNames: ['depositor_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('insurance_claims', 'idx_insurance_claims_vault');
    await queryRunner.dropIndex('insurance_claims', 'idx_insurance_claims_depositor');
    await queryRunner.dropIndex('insurance_claims', 'idx_insurance_claims_status');
    await queryRunner.dropTable('insurance_claims');
  }
}