# 📜 Smart Contract Documentation

Stack: **Solidity ^0.8.19** | Framework: **Foundry**

---

## Architecture

```
contracts/src/
├── interfaces/
│   └── IVault.sol        # Vault interface (decouples definition from impl)
├── libraries/
│   └── VaultLib.sol      # Pure share/asset math (reusable, independently testable)
├── Vault.sol             # Main vault — implements IVault, uses VaultLib
└── MockERC20.sol         # ERC20 mock for tests
```

### Design Patterns Applied
- **Interface segregation** — `IVault` separates the contract ABI from implementation
- **Library pattern** — `VaultLib` extracts pure math, enabling reuse across future vault variants
- **ReentrancyGuard** — all state-mutating functions are protected
- **Ownable** — admin functions restricted to owner

---

## IVault Interface

Defines the public surface of any vault implementation:

| Function | Description |
|---|---|
| `deposit(assets, receiver)` | Deposit assets, receive shares |
| `withdraw(assets, receiver, owner)` | Burn shares, receive assets |
| `redeem(shares, receiver, owner)` | Redeem shares for assets |
| `convertToShares(assets)` | Preview share amount for assets |
| `convertToAssets(shares)` | Preview asset amount for shares |
| `totalAssets()` | Total assets held in vault |
| `previewDeposit/Withdraw/Redeem` | Read-only previews |

---

## VaultLib Library

Pure functions for share/asset math. No state, no side effects.

```solidity
VaultLib.toShares(assets, totalSupply, totalAssets_) → shares
VaultLib.toAssets(shares, totalSupply, totalAssets_) → assets
```

When `totalSupply == 0` (empty vault), returns a 1:1 ratio.

---

## Vault Contract

Inherits: `IVault`, `ERC20`, `Ownable`, `ReentrancyGuard`  
Uses: `VaultLib`

### Key Invariants
- `totalAssets_ == sum(deposits) - sum(withdrawals)`
- `convertToAssets(convertToShares(x)) ≈ x` (±1 wei rounding)
- No user can withdraw more than their proportional share

---

## Testing

```bash
cd contracts

# All tests (10,000 fuzz runs each)
forge test

# Specific suites
forge test --match-path test/VaultFuzz.t.sol
forge test --match-path test/VaultInvariant.t.sol
forge test --match-path test/VaultEdgeCases.t.sol
forge test --match-path test/VaultStateful.t.sol

# Coverage
forge coverage

# Gas report
forge test --gas-report
```

### Test Suites

| File | Type | Cases |
|---|---|---|
| `VaultFuzz.t.sol` | Fuzz | 15 — random deposit/withdraw/redeem |
| `VaultInvariant.t.sol` | Invariant | 8 — property-based state checks |
| `VaultEdgeCases.t.sol` | Edge cases | 20+ — boundary & rounding |
| `VaultStateful.t.sol` | Stateful fuzz | 10 — multi-step sequences |

---

## Deployment

```bash
# Testnet
forge script script/Deploy.s.sol --rpc-url $STELLAR_RPC_URL --broadcast

# Set env vars
VAULT_CONTRACT_ADDRESS=<deployed_address>
SOROBAN_INDEXER_ENABLED=true
```
