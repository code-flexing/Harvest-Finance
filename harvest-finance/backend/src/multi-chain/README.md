# Multi-chain data bridge

A thin abstraction so Harvest's yield reporting can grow beyond Stellar without
a refactor. `StellarYieldAdapter` and `SolanaYieldAdapter` are registered.

## Adding a new chain adapter

1. Create a new adapter class under `adapters/`.
2. Implement `ChainAdapter` from `interfaces/chain-adapter.interface.ts`.

   Required contract:
   - `readonly chain: string`
     - A lower-case chain key, e.g. `stellar`, `ethereum`, `solana`.
     - Must be unique across adapters and match the `chain` field on every
       returned `ChainYield`.
   - `getYieldsForUser(userId: string): Promise<ChainYield[]>`
     - Return a flat array of positions owned by the user on this chain.
     - Return `[]` when the user has no positions on this chain.
     - Prefer graceful degradation for temporary failures rather than throwing.

   `ChainYield` shape:
   - `chain` — same lower-case chain key as the adapter.
   - `positionId` — stable, chain-scoped unique identifier for the position.
   - `positionName` — human-friendly label for UI display.
   - `principal` — principal amount as a decimal string in native asset units.
   - `asset` — metadata object with `code` and chain-specific `issuer`.
   - `apr` — APR in percent or `null` when unknown.
   - `estimatedAnnualYield` — `principal * apr/100` as a decimal string, or
     `null` when APR is unknown.
   - `metadata?` — adapter-specific details passed through unchanged.

3. Register the adapter in `MultiChainModule.providers`.
4. Add it to the `CHAIN_ADAPTERS` factory injection list and returned array:

   ```ts
   {
     provide: CHAIN_ADAPTERS,
     useFactory: (stellar, ethereum) => [stellar, ethereum],
     inject: [StellarYieldAdapter, EthereumYieldAdapter],
   }
   ```

5. (Optional) Add adapter unit tests to verify:
   - `getYieldsForUser` returns `[]` for users with no positions.
   - the adapter handles missing upstream data without throwing.

### What happens next

`MultiChainService` automatically fans out across every registered adapter
and aggregates their results. If a single adapter fails, its error is recorded
under `errors`, but the overall cross-chain response still returns data from
other adapters.
