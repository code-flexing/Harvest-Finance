import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Initial Database Schema Migration
 *
 * Creates all core tables for the agricultural marketplace:
 * - users
 * - orders
 * - transactions
 * - verifications
 * - credit_scores
 *
 * This migration includes:
 * - All primary keys (UUID)
 * - Foreign key constraints
 * - Indexes for query optimization
 * - Unique constraints
 * - PostgreSQL-specific types (JSONB, ENUM)
 */
export class CreateInitialSchema1700000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1700000000000';

  /**
   * Up Migration - Create all tables
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('FARMER', 'BUYER', 'INSPECTOR', 'ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'IN_ESCROW', 'COMPLETED', 'CANCELLED', 'EXPIRED')
    `);
    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM ('ESCROW_DEPOSIT', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'DIRECT_PAYMENT')
    `);
    await queryRunner.query(`
      CREATE TYPE "verification_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    `);

    // Create Users Table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'role',
            type: 'user_role_enum',
            default: "'FARMER'",
          },
          {
            name: 'stellar_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'first_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'profile_image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for Users table
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_role',
        columnNames: ['role'],
      }),
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_stellar_address',
        columnNames: ['stellar_address'],
      }),
    );

    // Create Orders Table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'farmer_id',
            type: 'uuid',
          },
          {
            name: 'buyer_id',
            type: 'uuid',
          },
          {
            name: 'crop_type',
            type: 'varchar',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'quantity_unit',
            type: 'varchar',
            default: "'kg'",
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'status',
            type: 'order_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'delivery_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expected_delivery_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'escrow_tx_hash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for Orders table
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_farmer_id',
        columnNames: ['farmer_id'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_buyer_id',
        columnNames: ['buyer_id'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_crop_type',
        columnNames: ['crop_type'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_created_at',
        columnNames: ['created_at'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'idx_orders_status_created',
        columnNames: ['status', 'created_at'],
      }),
    );

    // Create foreign keys for Orders table
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'fk_orders_farmer',
        columnNames: ['farmer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'fk_orders_buyer',
        columnNames: ['buyer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create Transactions Table
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'order_id',
            type: 'uuid',
          },
          {
            name: 'stellar_tx_hash',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'asset_code',
            type: 'varchar',
            default: "'XLM'",
          },
          {
            name: 'asset_issuer',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'transaction_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'type',
            type: 'transaction_type_enum',
            default: "'ESCROW_DEPOSIT'",
          },
          {
            name: 'source_account',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'destination_account',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'stellar_memo',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'confirmed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'memo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for Transactions table
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_order_id',
        columnNames: ['order_id'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_stellar_tx_hash',
        columnNames: ['stellar_tx_hash'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign key for Transactions table
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'fk_transactions_order',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create Verifications Table
    await queryRunner.createTable(
      new Table({
        name: 'verifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'order_id',
            type: 'uuid',
          },
          {
            name: 'inspector_id',
            type: 'uuid',
          },
          {
            name: 'proof_hash',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'verification_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'inspection_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'crop_quality',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'quantity_verified',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'verification_documents',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejected_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for Verifications table
    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'idx_verifications_order_id',
        columnNames: ['order_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'idx_verifications_inspector_id',
        columnNames: ['inspector_id'],
      }),
    );
    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'idx_verifications_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'verifications',
      new TableIndex({
        name: 'idx_verifications_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign keys for Verifications table
    await queryRunner.createForeignKey(
      'verifications',
      new TableForeignKey({
        name: 'fk_verifications_order',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'verifications',
      new TableForeignKey({
        name: 'fk_verifications_inspector',
        columnNames: ['inspector_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create Credit Scores Table
    await queryRunner.createTable(
      new Table({
        name: 'credit_scores',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'farmer_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'score',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_transactions',
            type: 'int',
            default: 0,
          },
          {
            name: 'successful_transactions',
            type: 'int',
            default: 0,
          },
          {
            name: 'failed_transactions',
            type: 'int',
            default: 0,
          },
          {
            name: 'total_volume',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: 'average_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_ratings',
            type: 'int',
            default: 0,
          },
          {
            name: 'history',
            type: 'jsonb',
            default: '[]',
          },
          {
            name: 'last_updated',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_order_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for Credit Scores table
    await queryRunner.createIndex(
      'credit_scores',
      new TableIndex({
        name: 'idx_credit_scores_farmer_id',
        columnNames: ['farmer_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'credit_scores',
      new TableIndex({
        name: 'idx_credit_scores_score',
        columnNames: ['score'],
      }),
    );

    // Create foreign key for Credit Scores table
    await queryRunner.createForeignKey(
      'credit_scores',
      new TableForeignKey({
        name: 'fk_credit_scores_farmer',
        columnNames: ['farmer_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  /**
   * Down Migration - Drop all tables
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'credit_scores',
      'fk_credit_scores_farmer',
    );
    await queryRunner.dropForeignKey(
      'verifications',
      'fk_verifications_inspector',
    );
    await queryRunner.dropForeignKey('verifications', 'fk_verifications_order');
    await queryRunner.dropForeignKey('transactions', 'fk_transactions_order');
    await queryRunner.dropForeignKey('orders', 'fk_orders_buyer');
    await queryRunner.dropForeignKey('orders', 'fk_orders_farmer');

    // Drop tables
    await queryRunner.dropTable('credit_scores');
    await queryRunner.dropTable('verifications');
    await queryRunner.dropTable('transactions');
    await queryRunner.dropTable('orders');
    await queryRunner.dropTable('users');

    // Drop ENUM types
    await queryRunner.query('DROP TYPE verification_status_enum');
    await queryRunner.query('DROP TYPE transaction_type_enum');
    await queryRunner.query('DROP TYPE transaction_status_enum');
    await queryRunner.query('DROP TYPE order_status_enum');
    await queryRunner.query('DROP TYPE user_role_enum');
  }
}
