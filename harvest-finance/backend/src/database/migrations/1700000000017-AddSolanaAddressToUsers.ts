import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddSolanaAddressToUsers1700000000017 implements MigrationInterface {
  name = 'AddSolanaAddressToUsers1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'solana_address',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_solana_address',
        columnNames: ['solana_address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_solana_address');
    await queryRunner.dropColumn('users', 'solana_address');
  }
}
