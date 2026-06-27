## Summary
Adds an API for vault owners to create a new vault by cloning an existing vault's configuration (type, capacity, rates, metadata, and multi-sig settings) while resetting all financial state.

## Purpose / Motivation
Power users who run multiple similar vaults previously had to re-enter the same settings manually. Cloning copies the template configuration in one step and starts the new vault with zero deposits and a fresh approval count.

## Changes Made
- #440: `POST /v1/vaults/:vaultId/clone` — authenticated endpoint for vault owners
- `VaultsService.cloneVaultFromTemplate` — deep-copies config fields; resets `totalDeposits`, `status` (ACTIVE), and `currentApprovals`
- `CloneVaultDto` — optional custom `vaultName` (defaults to `{source name} (Copy)`)
- Integration tests for success, custom name, not found, and unauthorized clone

## How to Test
1. Authenticate as a user who owns a vault with non-default settings (capacity, interest, multi-sig, etc.).
2. `POST /v1/vaults/{vaultId}/clone` with an empty body or `{ "vaultName": "My Clone" }`.
3. Expect `201` and a new vault ID with matching config but `totalDeposits: 0`, `status: ACTIVE`, `currentApprovals: 0`.
4. `GET /v1/vaults/my-vaults` — confirm both source and clone appear.
5. Clone another user's vault — expect `401`.
6. Clone a non-existent vault ID — expect `404`.

## Screenshots (if applicable)
N/A — API-only change.

## Breaking Changes
- None.

## Related Issues
Closes code-flexing/Harvest-Finance#440

## Checklist
- [x] Code builds successfully
- [x] Tests added/updated
- [ ] No console errors
- [ ] Documentation updated (if needed)
