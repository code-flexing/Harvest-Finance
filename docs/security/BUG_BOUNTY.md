# Harvest Finance — Immunefi Bug Bounty Program

**Platform:** [Immunefi](https://immunefi.com)  
**Status:** Ready for submission  
**Last updated:** 2026-04-28  

---

## Overview

Harvest Finance is a yield optimization protocol built on EVM-compatible chains.
This bug bounty program covers the core smart contracts responsible for asset
custody, yield strategy routing, governance, and price oracle integration.
We invite security researchers to responsibly disclose vulnerabilities in exchange
for rewards based on severity.

---

## Scope

### In Scope — Smart Contracts

| Contract | Address | Description |
|---|---|---|
| `Vault.sol` | TBD (post-deployment) | ERC4626-like upgradeable vault. Handles deposits, withdrawals, share minting/burning, MEV protection, and per-block withdrawal rate limiting. |
| `Controller.sol` | TBD (post-deployment) | Manages vault-strategy relationships and triggers hard work (rebalancing/compounding). |
| `GovernanceTimelock.sol` | TBD (post-deployment) | Queues, delays, and executes privileged admin operations. Minimum delay enforced on all governance actions. |
| `Storage.sol` | TBD (post-deployment) | On-chain key-value storage for protocol configuration. |
| `PriceOracle.sol` | TBD (post-deployment) | Price feed integration with staleness checks. |

### Out of Scope

- Frontend and backend infrastructure
- Third-party dependencies (OpenZeppelin contracts used as-is)
- Issues already known and documented in `contracts/00_START_HERE.md`
- Theoretical issues with no demonstrable impact
- Issues requiring compromised admin/multisig keys (already a known trust assumption)
- Gas optimization suggestions
- Issues in test files (`contracts/test/`)

---

## Reward Structure

Rewards are denominated in USD and paid in USDC or the protocol token.

| Severity | Description | Reward |
|---|---|---|
| 🔴 Critical | Direct loss of user funds, unauthorized withdrawal of vault assets, complete access control bypass | Up to $50,000 |
| 🔴 High | Significant loss of funds affecting a subset of users, permanent freezing of funds, oracle manipulation enabling unfair value extraction | Up to $20,000 |
| 🟡 Medium | Temporary freezing of funds, griefing attacks, rate limit bypass, incorrect share/asset accounting | Up to $5,000 |
| 🟢 Low | Minor contract logic issues, events not emitted correctly, view function inaccuracies | Up to $1,000 |

---

## Key Attack Surfaces

The following areas are of highest interest to the program based on the contract architecture:

### 1. Vault Share Accounting (`Vault.sol`)
The `VaultLib.toShares()` and `VaultLib.toAssets()` functions determine how user
deposits convert to shares and vice versa. Bugs here could allow an attacker to
inflate or deflate share prices, enabling theft of assets from other depositors.
Particularly relevant: first-depositor share inflation attacks (ERC4626 classic vulnerability).

### 2. MEV Protection and Oracle Manipulation (`Vault.sol`, `PriceOracle.sol`)
The `_enforceMEVProtection()` function relies on `PriceOracle.getPrice()` and
`PriceOracle.isStale()`. Bugs of interest include: oracle price manipulation,
staleness check bypass, and `maxSlippageBps` validation edge cases.

### 3. Per-Block Withdrawal Rate Limiting (`Vault.sol`)
The `_checkWithdrawalLimit()` function tracks cumulative withdrawals per block.
Bugs of interest include: limit bypass via multiple calls within a block,
integer overflow in `cumulativeWithdrawalsInBlock`, or griefing by filling
the block limit to deny legitimate withdrawals.

### 4. UUPS Upgrade Authorization (`Vault.sol`, `Controller.sol`)
Both contracts use UUPS upgradeable proxy pattern. The `_authorizeUpgrade()`
function is restricted to `UPGRADER_ROLE` and `DEFAULT_ADMIN_ROLE` respectively.
Bugs of interest include: unauthorized upgrade execution, storage collision
between proxy and implementation, and uninitialized implementation contract exploits.

### 5. Governance Timelock Bypass (`GovernanceTimelock.sol`)
The timelock enforces a minimum delay on all privileged operations. Bugs of
interest include: operation hash collision enabling replay attacks, delay bypass,
and reentrancy during `execute()` via the arbitrary `target.call`.

### 6. Access Control (`Vault.sol`, `Controller.sol`, `GovernanceTimelock.sol`)
All three contracts use OpenZeppelin AccessControl. Bugs of interest include:
role escalation, DEFAULT_ADMIN_ROLE misconfiguration, and unprotected
initializer functions on implementation contracts.

---

## Vulnerability Classification

### Critical
- Direct theft of user funds from the Vault
- Unauthorized minting of shares without depositing assets
- Complete bypass of `UPGRADER_ROLE` or `DEFAULT_ADMIN_ROLE` to upgrade contracts
- Draining the vault via reentrancy despite `ReentrancyGuardUpgradeable`
- Timelock bypass allowing immediate execution of privileged operations

### High
- Share price manipulation via first-deposit inflation attack
- Oracle price manipulation causing incorrect share/asset conversions
- Permanent freezing of all vault deposits
- Unauthorized strategy replacement via `Controller.setStrategy()`

### Medium
- Per-block withdrawal limit bypass
- Griefing attack that prevents legitimate users from withdrawing
- MEV protection bypass via `maxSlippageBps` edge case
- Stale oracle price not correctly detected by `isStale()`

### Low
- Incorrect event emissions
- View function returning incorrect values
- Minor inconsistencies between `previewDeposit` and actual `deposit` output

---

## Rules of Engagement

1. **Do not** test on mainnet. Use testnets or local forks only.
2. **Do not** exploit a vulnerability beyond what is necessary to demonstrate it.
3. **Do not** access, modify, or exfiltrate user data.
4. **Do not** perform denial-of-service attacks against live infrastructure.
5. Provide a clear proof-of-concept (PoC) — Foundry test preferred.
6. Give the team a minimum of **72 hours** to respond before public disclosure.
7. Issues must be reported privately via Immunefi — do not post publicly before a fix is deployed.

---

## Submission Requirements

A valid bug report must include:

- **Title** — short description of the vulnerability
- **Contract and function** — exact location of the bug
- **Severity** — your assessment with justification
- **Description** — clear explanation of the vulnerability and its impact
- **Proof of Concept** — Foundry test (`.t.sol`) demonstrating the exploit
- **Recommended fix** — your suggested remediation

Reports without a working PoC will not be eligible for rewards.

---

## Safe Harbor

Harvest Finance will not pursue legal action against researchers who:

- Act in good faith and follow the rules of engagement above
- Do not access, exfiltrate, or destroy user data
- Report findings through Immunefi before public disclosure
- Do not disrupt protocol operations

---

## Contact

- **Bug reports:** Via [Immunefi](https://immunefi.com) platform only
- **Security questions:** security@harvest.finance (response within 72 hours)
- **Public disclosure policy:** 90 days after fix deployment

---

*This program is subject to Immunefi's standard terms and conditions.*
