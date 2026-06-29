import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * A ledger range that maps to a specific contract version.
 * `toLedger` is null when the version is still current (open-ended range).
 */
export interface ContractVersionRange {
  version: string;
  fromLedger: number;
  toLedger: number | null;
}

/**
 * ContractVersionRegistry
 *
 * Maps a contractId + ledger number → contract version string.
 * The registry is seeded from environment config (JSON) so it can be
 * configured per-environment without code changes.
 *
 * ENV variable: SOROBAN_CONTRACT_VERSIONS
 * Format (JSON):
 * {
 *   "CONTRACT_ID_A": [
 *     { "version": "v1", "fromLedger": 0,      "toLedger": 499999 },
 *     { "version": "v2", "fromLedger": 500000,  "toLedger": null   }
 *   ]
 * }
 *
 * When no contractId match is found, the fallback version "v1" is returned
 * so historical events from unregistered contracts still get a best-effort parse.
 */
@Injectable()
export class ContractVersionRegistry {
  private readonly registry: Map<string, ContractVersionRange[]> = new Map();
  private readonly fallbackVersion: string;

  constructor(private readonly config: ConfigService) {
    this.fallbackVersion = config.get<string>(
      'SOROBAN_DEFAULT_CONTRACT_VERSION',
      'v1',
    );

    const raw = config.get<string>('SOROBAN_CONTRACT_VERSIONS', '{}');
    try {
      const parsed = JSON.parse(raw) as Record<
        string,
        ContractVersionRange[]
      >;
      for (const [contractId, ranges] of Object.entries(parsed)) {
        // Sort ascending so resolveVersion can do a simple linear scan.
        const sorted = [...ranges].sort((a, b) => a.fromLedger - b.fromLedger);
        this.registry.set(contractId, sorted);
      }
    } catch {
      // Malformed JSON — proceed with empty registry; every event falls back.
    }
  }

  /**
   * Returns the version string applicable to the given contract at the given ledger.
   * Falls back to `fallbackVersion` when the contract is not registered.
   */
  resolveVersion(contractId: string | null, ledger: number): string {
    if (!contractId) return this.fallbackVersion;

    const ranges = this.registry.get(contractId);
    if (!ranges) return this.fallbackVersion;

    for (const range of ranges) {
      if (
        ledger >= range.fromLedger &&
        (range.toLedger === null || ledger <= range.toLedger)
      ) {
        return range.version;
      }
    }

    return this.fallbackVersion;
  }
}
