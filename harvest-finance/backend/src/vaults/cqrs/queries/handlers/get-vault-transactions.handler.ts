import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVaultTransactionsQuery } from '../get-vault-transactions.query';
import { VaultReadRepository } from '../../../read/vault-read.repository';

@QueryHandler(GetVaultTransactionsQuery)
export class GetVaultTransactionsHandler implements IQueryHandler<GetVaultTransactionsQuery> {
  constructor(private readonly readRepo: VaultReadRepository) {}

  async execute(query: GetVaultTransactionsQuery) {
    const { vaultId, limit } = query;
    return this.readRepo.getTransactions(vaultId, limit);
  }
}
