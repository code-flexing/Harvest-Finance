# Multi-chain data bridge

A thin abstraction so Harvest's yield reporting can grow beyond Stellar without
a refactor. Today only `StellarYieldAdapter` is wired.

## Adding a new chain

1. Implement `ChainAdapter` (see `interfaces/chain-adapter.interface.ts`).
   - `chain` — lower-case key, e.g. `'ethereum'`, `'solana'`.
   - `getYieldsForUser(userId)` — return `ChainYield[]` for the user. Return
     `[]` (do not throw) when the user has no presence on this chain.
2. Drop the new adapter into `MultiChainModule.providers`.
3. Add it to the `CHAIN_ADAPTERS` factory's `inject` list and returned array:

   ```ts
   {
     provide: CHAIN_ADAPTERS,
     useFactory: (stellar, ethereum) => [stellar, ethereum],
     inject: [StellarYieldAdapter, EthereumYieldAdapter],
   }
   ```

That's it — `MultiChainService.getCrossChainYields` will fan out across the
new adapter automatically. A single failing adapter is reported under
`errors` rather than failing the whole response.
