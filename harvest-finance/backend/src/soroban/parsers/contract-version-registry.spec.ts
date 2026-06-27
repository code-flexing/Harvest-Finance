import { ConfigService } from '@nestjs/config';
import { ContractVersionRegistry } from './contract-version-registry';

function makeRegistry(envOverrides: Record<string, string> = {}) {
  const config = {
    get: (key: string, fallback?: string) => envOverrides[key] ?? fallback,
  } as unknown as ConfigService;
  return new ContractVersionRegistry(config);
}

const CONTRACT_A = 'CONTRACT_A';
const versions = JSON.stringify({
  [CONTRACT_A]: [
    { version: 'v1', fromLedger: 0,      toLedger: 499999 },
    { version: 'v2', fromLedger: 500000, toLedger: null   },
  ],
});

describe('ContractVersionRegistry', () => {
  it('resolves v1 for ledger in v1 range', () => {
    const registry = makeRegistry({ SOROBAN_CONTRACT_VERSIONS: versions });
    expect(registry.resolveVersion(CONTRACT_A, 100000)).toBe('v1');
  });

  it('resolves v2 for ledger in v2 range', () => {
    const registry = makeRegistry({ SOROBAN_CONTRACT_VERSIONS: versions });
    expect(registry.resolveVersion(CONTRACT_A, 600000)).toBe('v2');
  });

  it('returns fallback for unknown contractId', () => {
    const registry = makeRegistry({ SOROBAN_CONTRACT_VERSIONS: versions });
    expect(registry.resolveVersion('UNKNOWN', 100000)).toBe('v1');
  });

  it('returns fallback for null contractId', () => {
    const registry = makeRegistry({ SOROBAN_CONTRACT_VERSIONS: versions });
    expect(registry.resolveVersion(null, 100000)).toBe('v1');
  });

  it('uses SOROBAN_DEFAULT_CONTRACT_VERSION as fallback', () => {
    const registry = makeRegistry({
      SOROBAN_DEFAULT_CONTRACT_VERSION: 'v2',
    });
    expect(registry.resolveVersion('UNKNOWN', 0)).toBe('v2');
  });

  it('returns fallback when ledger is outside all ranges', () => {
    const noGap = JSON.stringify({
      [CONTRACT_A]: [
        { version: 'v1', fromLedger: 1000, toLedger: 1999 },
      ],
    });
    const registry = makeRegistry({ SOROBAN_CONTRACT_VERSIONS: noGap });
    expect(registry.resolveVersion(CONTRACT_A, 500)).toBe('v1');
  });
});
