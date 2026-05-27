/**
 * A yield-bearing position on a specific chain.
 *
 * Adapters return a flat array of these so the service layer can aggregate
 * across chains without knowing anything about the underlying network.
 */
export interface ChainYield {
  /** Lower-case chain key — e.g. `stellar`, `ethereum`, `solana`. */
  chain: string;

  /**
   * Stable identifier for the position itself (e.g. a Stellar vault id, an
   * EVM contract+account tuple). Combined with `chain` it MUST be unique.
   */
  positionId: string;

  /** Human-friendly label for UIs. */
  positionName: string;

  /** Principal amount as a decimal string, in the asset's native units. */
  principal: string;

  /** Asset metadata. `issuer` is chain-specific (Stellar issuer, EVM contract). */
  asset: {
    code: string;
    issuer: string | null;
  };

  /** Annual percentage rate in percent (e.g. 7.5). Null if unknown. */
  apr: number | null;

  /** principal * apr/100 (decimal string). Null when apr is unknown. */
  estimatedAnnualYield: string | null;

  /** Adapter-specific extras the controller passes through verbatim. */
  metadata?: Record<string, unknown>;
}

/**
 * Implemented once per supported chain. Bring up a new chain by writing one
 * of these and registering it in the `CHAIN_ADAPTERS` provider array.
 */
export interface ChainAdapter {
  /** Lower-case identifier — must match `ChainYield.chain`. */
  readonly chain: string;

  /**
   * Fetch yield-bearing positions held by a user on this chain. Should
   * return `[]` (not throw) when the user has no presence on this chain.
   */
  getYieldsForUser(userId: string): Promise<ChainYield[]>;
}

/** DI token used to register the array of `ChainAdapter`s with Nest. */
export const CHAIN_ADAPTERS = Symbol('CHAIN_ADAPTERS');
