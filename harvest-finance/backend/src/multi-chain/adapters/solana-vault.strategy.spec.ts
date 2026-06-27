import { parseSolanaVaultStrategies } from './solana-vault.strategy';

describe('parseSolanaVaultStrategies', () => {
  it('returns [] for empty or missing config', () => {
    expect(parseSolanaVaultStrategies(undefined)).toEqual([]);
    expect(parseSolanaVaultStrategies('')).toEqual([]);
    expect(parseSolanaVaultStrategies('   ')).toEqual([]);
  });

  it('parses a valid strategy array', () => {
    const raw = JSON.stringify([
      {
        mint: 'Mint111',
        name: 'USDC Vault',
        assetCode: 'USDC',
        apr: 9.25,
      },
    ]);

    expect(parseSolanaVaultStrategies(raw)).toEqual([
      {
        mint: 'Mint111',
        name: 'USDC Vault',
        assetCode: 'USDC',
        apr: 9.25,
      },
    ]);
  });

  it('returns [] for invalid JSON or non-array payloads', () => {
    expect(parseSolanaVaultStrategies('not-json')).toEqual([]);
    expect(parseSolanaVaultStrategies('{"mint":"x"}')).toEqual([]);
  });

  it('skips entries without a mint address', () => {
    const raw = JSON.stringify([
      { name: 'No mint' },
      { mint: '  ValidMint  ', name: 'OK', assetCode: 'SOL' },
    ]);

    expect(parseSolanaVaultStrategies(raw)).toEqual([
      {
        mint: 'ValidMint',
        name: 'OK',
        assetCode: 'SOL',
        apr: undefined,
      },
    ]);
  });
});
