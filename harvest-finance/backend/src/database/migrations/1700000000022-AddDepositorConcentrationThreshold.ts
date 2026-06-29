import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDepositorConcentrationThreshold1700000000022
  implements MigrationInterface
{
  name = 'AddDepositorConcentrationThreshold1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vaults',
      new TableColumn({
        name: 'depositor_concentration_threshold',
        type: 'decimal',
        precision: 5,
        scale: 4,
        default: 0.5,
        isNullable: false,
      }),
    );

    await queryRunner.query(`
      ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'DEPOSITOR_CONCENTRATION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vaults', 'depositor_concentration_threshold');
  }
}
