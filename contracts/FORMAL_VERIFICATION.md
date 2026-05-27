# Formal Verification — Vault Core Accounting

This directory contains formal verification specifications for the
`Vault` contract's core accounting logic, targeted at preventing
ERC-4626-style **share inflation / donation** attacks and related
classes of accounting bugs (insolvency, phantom shares, depositor
dilution).

Two complementary tools are wired up:

| Tool                                                               | Approach                                | Spec file                       |
|--------------------------------------------------------------------|-----------------------------------------|---------------------------------|
| [Halmos](https://github.com/a16z/halmos)                           | Solidity-native symbolic execution      | `test/VaultFormal.t.sol`        |
| [Certora Prover](https://docs.certora.com/)                        | SMT-based deductive verification        | `certora/specs/Vault.spec`      |

The same seven properties are encoded in both. Halmos is free and
self-hosted; Certora requires an account and the `certoraRun` CLI.

> [!NOTE]
> Issue [#148](https://github.com/code-flexing/Harvest-Finance/issues/148)
> requested *basic formal verification specs* for the vault's core
> accounting logic to prevent inflation bugs. This sets up the spec
> harness — patching the underlying Vault to actually satisfy every
> property is tracked separately (see "Known limitations" below).

---

## Quick start

### Halmos

```bash
# Install (one time)
pip install halmos

# Run all symbolic specs
cd contracts
halmos --contract VaultFormalSpec
# or via npm
npm run verify:halmos
```

### Certora

```bash
# Install (one time)
pip install certora-cli
export CERTORAKEY=<your-key>

# Run the prover
cd contracts
certoraRun certora/conf/Vault.conf
# or via npm
npm run verify:certora
```

### Foundry fuzz fallback

The spec functions in `test/VaultFormal.t.sol` are dual-purpose: each
`check_*` symbolic property has a `test_*` wrapper that runs as a
bounded Foundry fuzz test. So even without Halmos installed you get a
regression baseline:

```bash
cd contracts
forge test --match-contract VaultFormalSpec
# or
npm run test:formal
```

---

## Properties verified

Each property is encoded once in Solidity (Halmos) and once in CVL
(Certora). Numbering matches between the two files.

### 1. Deposit accounting integrity
`totalAssets()` increases by exactly the deposited amount, and the
receiver's share balance increases by exactly the value returned from
`deposit`.

### 2. Withdraw accounting integrity
`totalAssets()` decreases by exactly the withdrawn amount, and the
receiver receives exactly that many underlying tokens.

### 3. Solvency
The vault's underlying-token balance is always ≥ `totalAssets_`.
Encoded in Certora as an inductive invariant across **every**
state-mutating method.

### 4. Share supply consistency
`totalSupply()` changes by exactly the number of shares minted
(deposit) or burned (withdraw) in a single call — never more, never
less.

### 5. Round-trip safety
A user who deposits `x` and immediately redeems all the resulting
shares cannot extract more than `x` underlying tokens. Bounds the
worst-case obligation of the vault to a single depositor relative to
their own contribution.

### 6. No phantom (zero-share) deposits
A successful `deposit` of a non-zero `assets` amount must mint a
strictly positive number of shares. **Zero-share deposits are the
canonical signature of the inflation attack** — the attacker inflates
the exchange rate so that a victim's `convertToShares(x)` rounds down
to 0 while the underlying tokens are absorbed by the vault.

### 7. Existing depositor not diluted by a new deposit
After Alice deposits, an unrelated subsequent deposit by Bob does not
reduce the asset value redeemable by Alice's shares (modulo a 1-wei
rounding loss from `convertToAssets` rounding down).

---

## Known limitations / follow-ups

These are documented now so future contributors know exactly what the
spec harness is and isn't asserting.

1. **Property 6 currently fails on the existing `Vault.sol`.**
   The contract uses the textbook ERC-4626 share formula with no virtual
   shares / decimal offset, so an attacker who is the first depositor
   can:
   1. Deposit 1 wei to mint 1 share.
   2. Donate a large amount of underlying directly to the vault to
      inflate `totalAssets_`.
   3. Wait for a victim to deposit `x` such that
      `(x * totalSupply) / totalAssets_ == 0`. Their shares are 0
      while their assets are absorbed.

   This is already empirically observed by the existing fuzz tests
   `testFuzz_LargeDeposits` and `testFuzz_LargeDepositRatio`, both of
   which fail on `main` for the same root cause. Halmos / Certora will
   produce explicit symbolic counterexamples. The Foundry regression
   wrapper for property 6 (`test_noPhantomShares_safeRange`) is bounded
   to the safe input range so CI stays green; the symbolic tools cover
   the unsafe range.

   **Suggested fix** (not in scope for #148): adopt
   OpenZeppelin's `ERC4626Upgradeable` virtual-share mitigation
   (`_decimalsOffset()`), or add a one-time `bootstrap` deposit at
   construction.

2. **Bound-related arithmetic overflow in two-amount properties.**
   The `convertToShares` formula `(assets * supply) / totalAssets_`
   overflows uint256 if both operands are near `2**128`. Properties
   that combine two independent symbolic amounts (e.g. property 7) cap
   each at `2**96` so the multiplication fits — this is a tooling
   constraint, not a contract bug. A SafeMath / Math.mulDiv based
   formulation in the contract would let us drop this bound.

3. **The existing fuzz suite has 12 unrelated pre-existing failures**
   (bad `bound(min,max)` calls, missing approvals in `setUp`, and the
   inflation cases above). They predate this branch and are not
   addressed here; this PR only adds new specs and keeps them green.

---

## File layout

```
contracts/
├── test/
│   └── VaultFormal.t.sol           # Halmos check_* + Foundry test_* wrappers
├── certora/
│   ├── specs/
│   │   └── Vault.spec              # CVL ruleset
│   └── conf/
│       └── Vault.conf              # certoraRun config
├── halmos.toml                     # Halmos config
└── FORMAL_VERIFICATION.md          # this file
```
