import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { CreateInsuranceClaims1700000000013 } from './1700000000013-CreateInsuranceClaims';

describe('CreateInsuranceClaims1700000000013', () => {
  let migration: CreateInsuranceClaims1700000000013;
  let queryRunner: QueryRunner;

  beforeEach(() => {
    migration = new CreateInsuranceClaims1700000000013();
    queryRunner = {
      createTable: jest.fn(),
      dropTable: jest.fn(),
      dropIndex: jest.fn(),
    } as any;
  });

  it('should create insurance claims table with correct structure', async () => {
    await migration.up(queryRunner);

    expect(queryRunner.createTable).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'insurance_claims',
        columns: expect.arrayContaining([
          expect.objectContaining({ name: 'id', type: 'uuid', isPrimary: true }),
          expect.objectContaining({ name: 'vault_id', type: 'uuid' }),
          expect.objectContaining({ name: 'depositor_id', type: 'uuid' }),
          expect.objectContaining({ name: 'loss_amount', type: 'decimal' }),
          expect.objectContaining({ name: 'payout_amount', type: 'decimal' }),
          expect.objectContaining({ name: 'status', type: 'enum' }),
          expect.objectContaining({ name: 'transaction_hash', type: 'text' }),
          expect.objectContaining({ name: 'reason', type: 'text' }),
        ]),
      }),
    );
  });

  it('should have correct enum values for status', async () => {
    await migration.up(queryRunner);
    const call = (queryRunner.createTable as jest.Mock).mock.calls[0][0];
    const statusColumn = call.columns.find((c: any) => c.name === 'status');

    expect(statusColumn.enum).toEqual(['PENDING', 'COMPLETED', 'FAILED', 'REJECTED']);
    expect(statusColumn.default).toBe("'PENDING'");
  });

  it('should have foreign key to vaults table', async () => {
    await migration.up(queryRunner);
    const call = (queryRunner.createTable as jest.Mock).mock.calls[0][0];

    expect(call.foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'fk_insurance_claims_vault',
          referencedTableName: 'vaults',
        }),
      ]),
    );
  });

  it('should have foreign key to users table', async () => {
    await migration.up(queryRunner);
    const call = (queryRunner.createTable as jest.Mock).mock.calls[0][0];

    expect(call.foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'fk_insurance_claims_depositor',
          referencedTableName: 'users',
        }),
      ]),
    );
  });

  it('should drop table on migration down', async () => {
    await migration.down(queryRunner);

    expect(queryRunner.dropIndex).toHaveBeenCalled();
    expect(queryRunner.dropTable).toHaveBeenCalledWith('insurance_claims');
  });
});