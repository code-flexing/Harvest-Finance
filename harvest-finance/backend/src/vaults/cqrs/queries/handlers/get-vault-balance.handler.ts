import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVaultBalanceQuery } from '../get-vault-balance.query';
import { VaultReadRepository } from '../../../read/vault-read.repository';

@QueryHandler(GetVaultBalanceQuery)
export class GetVaultBalanceHandler implements IQueryHandler<GetVaultBalanceQuery> {
  constructor(private readonly readRepo: VaultReadRepository) {}

  async execute(query: GetVaultBalanceQuery) {
    const { vaultId, userId } = query;
    // read-only: use read repository
    return this.readRepo.getBalance(vaultId, userId);
  }
}
