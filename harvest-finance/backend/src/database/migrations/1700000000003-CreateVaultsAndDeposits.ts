import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateVaultsAndDeposits1700000000003 implements MigrationInterface {
  name = 'CreateVaultsAndDeposits1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vaults table
    await queryRunner.createTable(
      new Table({
        name: 'vaults',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'owner_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'CROP_PRODUCTION',
              'EQUIPMENT_FINANCING',
              'LAND_ACQUISITION',
              'INSURANCE_FUND',
              'EMERGENCY_FUND',
            ],
            default: "'CROP_PRODUCTION'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'INACTIVE', 'FROZEN', 'FULL_CAPACITY'],
            default: "'ACTIVE'",
          },
          {
            name: 'vault_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_deposits',
            type: 'decimal',
            precision: 18,
            scale: 8,
            default: 0,
          },
          {
            name: 'max_capacity',
            type: 'decimal',
            precision: 18,
            scale: 8,
            default: 0,
          },
          {
            name: 'interest_rate',
            type: 'decimal',
            precision: 18,
            scale: 8,
            default: 0,
          },
          {
            name: 'maturity_date',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lock_period_end',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'is_public',
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
      }),
    );

    // Create deposits table
    await queryRunner.createTable(
      new Table({
        name: 'deposits',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
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
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED'],
            default: "'PENDING'",
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
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
            name: 'confirmed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'notes',
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
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deposits');
    await queryRunner.dropTable('vaults');
  }
}
