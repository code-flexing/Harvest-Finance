import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddEmailVerificationToUsers1700000000023 implements MigrationInterface {
  name = 'AddEmailVerificationToUsers1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_verified_at column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verified_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    // Create index on email_verified_at for faster queries
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email_verified_at',
        columnNames: ['email_verified_at'],
      }),
    );

    // Drop email_verification_token column if it exists (we use JWT instead)
    const table = await queryRunner.getTable('users');
    if (table.findColumn('email_verification_token')) {
      await queryRunner.dropColumn('users', 'email_verification_token');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.dropIndex('users', 'idx_users_email_verified_at');

    // Drop email_verified_at column
    await queryRunner.dropColumn('users', 'email_verified_at');

    // Re-add email_verification_token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verification_token',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
