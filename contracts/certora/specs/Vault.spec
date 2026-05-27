/*
 * Certora Verification Language (CVL) specification for the Vault.
 *
 * Verifies the same seven core accounting / inflation properties as
 * test/VaultFormal.t.sol, but using Certora's SMT-based prover instead
 * of Halmos symbolic execution.
 *
 * Run with:
 *   certoraRun certora/conf/Vault.conf
 *
 * See FORMAL_VERIFICATION.md for installation and usage details.
 */

using MockERC20 as _asset;

methods {
    // Vault
    function totalAssets() external returns (uint256) envfree;
    function totalSupply() external returns (uint256) envfree;
    function balanceOf(address) external returns (uint256) envfree;
    function convertToShares(uint256) external returns (uint256) envfree;
    function convertToAssets(uint256) external returns (uint256) envfree;
    function deposit(uint256, address) external returns (uint256);
    function withdraw(uint256, address, address) external returns (uint256);
    function redeem(uint256, address, address) external returns (uint256);

    // Underlying asset
    function _asset.balanceOf(address) external returns (uint256) envfree;
}

// --------------------------------------------------------------------
// Helper definitions
// --------------------------------------------------------------------

definition vaultAssetBalance() returns uint256 = _asset.balanceOf(currentContract);

// --------------------------------------------------------------------
// PROPERTY 1 — Deposit accounting integrity
// --------------------------------------------------------------------
rule depositAccountingIntegrity(uint256 amount, address receiver) {
    env e;
    require receiver != 0;
    require amount > 0;

    uint256 totalBefore = totalAssets();
    uint256 sharesBefore = balanceOf(receiver);

    uint256 minted = deposit(e, amount, receiver);

    assert totalAssets() == totalBefore + amount,
        "totalAssets must increase by deposit amount";
    assert balanceOf(receiver) == sharesBefore + minted,
        "receiver share balance must increase by minted amount";
}

// --------------------------------------------------------------------
// PROPERTY 2 — Withdraw accounting integrity
// --------------------------------------------------------------------
rule withdrawAccountingIntegrity(uint256 amount, address receiver, address owner) {
    env e;
    require receiver != 0;
    require amount > 0;

    uint256 totalBefore = totalAssets();
    uint256 receiverBalBefore = _asset.balanceOf(receiver);

    withdraw(e, amount, receiver, owner);

    assert totalAssets() == totalBefore - amount,
        "totalAssets must decrease by withdraw amount";
    assert _asset.balanceOf(receiver) == receiverBalBefore + amount,
        "receiver must get exactly assets";
}

// --------------------------------------------------------------------
// PROPERTY 3 — Solvency
//   The vault's underlying balance is always at least the value tracked
//   in totalAssets_. This must hold across any single state-mutating
//   call.
// --------------------------------------------------------------------
rule solvency(method f) filtered { f -> !f.isView } {
    env e;
    calldataarg args;

    require vaultAssetBalance() >= totalAssets();

    f(e, args);

    assert vaultAssetBalance() >= totalAssets(),
        "vault underlying balance must remain >= totalAssets_";
}

// --------------------------------------------------------------------
// PROPERTY 4 — Share supply consistency on deposit
// --------------------------------------------------------------------
rule shareSupplyConsistencyOnDeposit(uint256 amount, address receiver) {
    env e;
    require receiver != 0;
    require amount > 0;

    uint256 supplyBefore = totalSupply();
    uint256 minted = deposit(e, amount, receiver);

    assert totalSupply() == supplyBefore + minted,
        "totalSupply must change by exactly minted shares";
}

// --------------------------------------------------------------------
// PROPERTY 4b — Share supply consistency on withdraw
// --------------------------------------------------------------------
rule shareSupplyConsistencyOnWithdraw(uint256 amount, address receiver, address owner) {
    env e;
    require receiver != 0;
    require amount > 0;

    uint256 supplyBefore = totalSupply();
    uint256 burned = withdraw(e, amount, receiver, owner);

    assert totalSupply() == supplyBefore - burned,
        "totalSupply must change by exactly burned shares";
}

// --------------------------------------------------------------------
// PROPERTY 5 — Round-trip safety
//   A single user cannot deposit `x` and immediately redeem more than `x`.
// --------------------------------------------------------------------
rule roundTripCannotExtractMoreThanDeposited(uint256 amount) {
    env e;
    require amount > 0;
    require e.msg.sender != currentContract;

    uint256 underlyingBefore = _asset.balanceOf(e.msg.sender);

    uint256 shares = deposit(e, amount, e.msg.sender);
    uint256 redeemed = redeem(e, shares, e.msg.sender, e.msg.sender);

    assert redeemed <= amount,
        "redeem must not extract more than deposited";
    assert _asset.balanceOf(e.msg.sender) <= underlyingBefore,
        "underlying balance cannot grow on round-trip";
}

// --------------------------------------------------------------------
// PROPERTY 6 — No phantom (zero-share) deposits
//   A successful deposit of a non-zero amount must mint a strictly
//   positive number of shares. Violation is the canonical ERC-4626
//   inflation/donation attack.
//
//   NOTE: This rule is expected to FAIL against the current Vault
//   implementation. The counterexample produced by Certora documents
//   the exploitable inflation path. See FORMAL_VERIFICATION.md.
// --------------------------------------------------------------------
rule noPhantomShares(uint256 amount, address receiver) {
    env e;
    require receiver != 0;
    require amount > 0;

    uint256 minted = deposit(e, amount, receiver);

    assert minted > 0,
        "deposit must mint strictly positive shares";
}

// --------------------------------------------------------------------
// PROPERTY 7 — Existing depositor not diluted by a new deposit
//   After Alice deposits, an unrelated subsequent deposit by Bob must
//   not reduce the assets redeemable by Alice's shares (modulo a 1-wei
//   rounding loss).
// --------------------------------------------------------------------
rule existingDepositorNotDilutedByNewDeposit(
    uint256 aliceAmt,
    uint256 bobAmt,
    address alice,
    address bob
) {
    env e1;
    env e2;
    require alice != 0 && bob != 0 && alice != bob;
    require aliceAmt > 0 && bobAmt > 0;
    require e1.msg.sender == alice;
    require e2.msg.sender == bob;

    deposit(e1, aliceAmt, alice);
    uint256 aliceClaimBefore = convertToAssets(balanceOf(alice));

    deposit(e2, bobAmt, bob);
    uint256 aliceClaimAfter = convertToAssets(balanceOf(alice));

    assert aliceClaimAfter + 1 >= aliceClaimBefore,
        "alice must not be diluted by bob's deposit (modulo 1-wei rounding)";
}
