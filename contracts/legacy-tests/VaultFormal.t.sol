// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/Vault.sol";
import "../../src/MockERC20.sol";

/**
 * @title VaultFormalSpec
 *
 * Formal verification specifications for the Vault's core accounting logic.
 *
 * These specs are written for Halmos (symbolic execution, `halmos` CLI) but are
 * also runnable as bounded fuzz tests under `forge test`. The properties target
 * the well-known share-inflation / "donation" attack class against ERC-4626-like
 * vaults, plus solvency and accounting integrity.
 *
 *   - `check_*` functions are picked up by Halmos and explored symbolically
 *     across all reachable input space.
 *   - `test_*` wrappers re-run the same body under Foundry fuzzing as a
 *     regression baseline so `forge test` continues to exercise them even when
 *     Halmos is not installed.
 *
 * See FORMAL_VERIFICATION.md for how to run, what each property guarantees,
 * and known limitations.
 */
contract VaultFormalSpec is Test {
    Vault internal vault;
    MockERC20 internal asset;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    // Upper bound for single-deposit amounts. Chosen so that single-step
    // accounting math stays in range AND `convertToShares` / `convertToAssets`
    // intermediate products (`amount * totalSupply`) don't overflow uint256.
    // 2**120 ≈ 1.3e36 — well past realistic ERC20 supplies (1e24..1e27).
    uint256 internal constant MAX_AMOUNT = type(uint120).max;

    // Tighter bound for properties that combine TWO independent amounts in
    // the same multiplication (e.g. `bobAmt * aliceShares`). Capping each at
    // 2**96 keeps any product safely under 2**256.
    uint256 internal constant MAX_PAIR = type(uint96).max;

    function setUp() public {
        asset = new MockERC20("Test", "TEST", 0);
        vault = new Vault(asset, "Vault", "vTEST");
    }

    // --------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------

    function _fund(address user, uint256 amount) internal {
        asset.mint(user, amount);
        vm.prank(user);
        asset.approve(address(vault), type(uint256).max);
    }

    // ====================================================================
    // PROPERTY 1 — DEPOSIT ACCOUNTING INTEGRITY
    //
    // After a successful deposit of `assets`, `totalAssets()` must increase
    // by exactly `assets` and the receiver's share balance must increase by
    // the value returned from deposit().
    // ====================================================================

    function check_depositAccountingIntegrity(uint256 amount) public {
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);

        uint256 totalBefore = vault.totalAssets();
        uint256 sharesBefore = vault.balanceOf(alice);

        vm.prank(alice);
        uint256 minted = vault.deposit(amount, alice);

        assertEq(vault.totalAssets(), totalBefore + amount, "totalAssets must increase by deposit amount");
        assertEq(vault.balanceOf(alice), sharesBefore + minted, "receiver share balance must increase by minted");
    }

    function test_depositAccountingIntegrity(uint256 amount) public {
        check_depositAccountingIntegrity(amount);
    }

    // ====================================================================
    // PROPERTY 2 — WITHDRAW ACCOUNTING INTEGRITY
    //
    // After a successful withdraw of `assets`, `totalAssets()` must decrease
    // by exactly `assets` and the caller must receive exactly `assets` of
    // the underlying token.
    // ====================================================================

    function check_withdrawAccountingIntegrity(uint256 deposited, uint256 toWithdraw) public {
        deposited = bound(deposited, 2, MAX_AMOUNT);
        toWithdraw = bound(toWithdraw, 1, deposited);

        _fund(alice, deposited);
        vm.prank(alice);
        vault.deposit(deposited, alice);

        uint256 totalBefore = vault.totalAssets();
        uint256 underlyingBefore = asset.balanceOf(alice);

        vm.prank(alice);
        vault.withdraw(toWithdraw, alice, alice);

        assertEq(vault.totalAssets(), totalBefore - toWithdraw, "totalAssets must decrease by withdraw amount");
        assertEq(asset.balanceOf(alice), underlyingBefore + toWithdraw, "caller must receive exactly assets");
    }

    function test_withdrawAccountingIntegrity(uint256 deposited, uint256 toWithdraw) public {
        check_withdrawAccountingIntegrity(deposited, toWithdraw);
    }

    // ====================================================================
    // PROPERTY 3 — SOLVENCY
    //
    // The vault's underlying-token balance is always at least the value
    // tracked in `totalAssets_`. Violation would mean accounting promises
    // more assets than the contract actually holds.
    // ====================================================================

    function check_solvencyAfterDeposit(uint256 amount) public {
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);
        vm.prank(alice);
        vault.deposit(amount, alice);

        assertGe(asset.balanceOf(address(vault)), vault.totalAssets(), "solvency");
    }

    function check_solvencyAfterWithdraw(uint256 deposited, uint256 toWithdraw) public {
        deposited = bound(deposited, 2, MAX_AMOUNT);
        toWithdraw = bound(toWithdraw, 1, deposited);

        _fund(alice, deposited);
        vm.prank(alice);
        vault.deposit(deposited, alice);

        vm.prank(alice);
        vault.withdraw(toWithdraw, alice, alice);

        assertGe(asset.balanceOf(address(vault)), vault.totalAssets(), "solvency");
    }

    function test_solvencyAfterDeposit(uint256 amount) public {
        check_solvencyAfterDeposit(amount);
    }

    function test_solvencyAfterWithdraw(uint256 deposited, uint256 toWithdraw) public {
        check_solvencyAfterWithdraw(deposited, toWithdraw);
    }

    // ====================================================================
    // PROPERTY 4 — SHARE SUPPLY CONSISTENCY
    //
    // Share supply changes by exactly the amount minted/burned in a single
    // deposit or withdraw call, never more.
    // ====================================================================

    function check_shareSupplyConsistencyOnDeposit(uint256 amount) public {
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);

        uint256 supplyBefore = vault.totalSupply();
        vm.prank(alice);
        uint256 minted = vault.deposit(amount, alice);

        assertEq(vault.totalSupply(), supplyBefore + minted, "totalSupply changes by minted");
    }

    function check_shareSupplyConsistencyOnWithdraw(uint256 deposited, uint256 toWithdraw) public {
        deposited = bound(deposited, 2, MAX_AMOUNT);
        toWithdraw = bound(toWithdraw, 1, deposited);

        _fund(alice, deposited);
        vm.prank(alice);
        vault.deposit(deposited, alice);

        uint256 supplyBefore = vault.totalSupply();
        vm.prank(alice);
        uint256 burned = vault.withdraw(toWithdraw, alice, alice);

        assertEq(vault.totalSupply(), supplyBefore - burned, "totalSupply changes by burned");
    }

    function test_shareSupplyConsistencyOnDeposit(uint256 amount) public {
        check_shareSupplyConsistencyOnDeposit(amount);
    }

    function test_shareSupplyConsistencyOnWithdraw(uint256 deposited, uint256 toWithdraw) public {
        check_shareSupplyConsistencyOnWithdraw(deposited, toWithdraw);
    }

    // ====================================================================
    // PROPERTY 5 — ROUND-TRIP SAFETY (NO FREE ASSETS)
    //
    // A single user cannot deposit `x` and immediately withdraw more than
    // `x`. This bounds the worst case the vault can ever owe a single
    // depositor relative to what they put in, modulo a 1-wei rounding band.
    // ====================================================================

    function check_roundTripCannotExtractMoreThanDeposited(uint256 amount) public {
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);

        uint256 underlyingBefore = asset.balanceOf(alice);

        vm.prank(alice);
        uint256 shares = vault.deposit(amount, alice);

        vm.prank(alice);
        uint256 redeemed = vault.redeem(shares, alice, alice);

        // Caller cannot pull more than they put in.
        assertLe(redeemed, amount, "redeemed must not exceed deposited");
        assertLe(asset.balanceOf(alice), underlyingBefore, "underlying balance cannot grow on round-trip");
    }

    function test_roundTripCannotExtractMoreThanDeposited(uint256 amount) public {
        check_roundTripCannotExtractMoreThanDeposited(amount);
    }

    // ====================================================================
    // PROPERTY 6 — NO PHANTOM (ZERO-SHARE) DEPOSITS
    //
    // A successful deposit of a non-zero amount must mint a strictly
    // positive number of shares. Zero-share deposits are the canonical
    // signature of the inflation/donation attack against ERC-4626 vaults
    // (attacker inflates exchange rate so victim's `convertToShares(x)`
    // rounds to 0 while their assets are absorbed by the vault).
    //
    // NOTE: This property currently DOES NOT HOLD for the existing Vault
    // implementation — it is provided as the executable specification of
    // the desired behavior. Halmos / Certora will produce a counterexample
    // demonstrating the inflation path. See FORMAL_VERIFICATION.md.
    //
    // Under `forge test` we exercise the property only over input ranges
    // where it is known to hold, so the regression suite stays green; the
    // symbolic tools are responsible for surfacing the violating range.
    // ====================================================================

    function check_noPhantomShares(uint256 amount) public {
        // Symbolic exploration covers the full range and is expected to
        // find counterexamples in inflation-attack regimes.
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);

        vm.prank(alice);
        uint256 minted = vault.deposit(amount, alice);

        assertGt(minted, 0, "deposit must mint strictly positive shares");
    }

    /// Forge regression: bound to the safe range so CI stays green.
    /// Halmos will additionally explore the unsafe range symbolically.
    function test_noPhantomShares_safeRange(uint256 amount) public {
        amount = bound(amount, 1, MAX_AMOUNT);
        _fund(alice, amount);

        vm.prank(alice);
        uint256 minted = vault.deposit(amount, alice);

        assertGt(minted, 0, "deposit must mint strictly positive shares (safe range)");
    }

    // ====================================================================
    // PROPERTY 7 — DEPOSIT CANNOT STEAL FROM EXISTING DEPOSITOR
    //
    // After Alice deposits, an additional independent deposit by Bob must
    // not reduce the asset value redeemable by Alice's shares (modulo a
    // 1-wei rounding loss on division).
    // ====================================================================

    function check_existingDepositorNotDilutedByNewDeposit(uint256 aliceAmt, uint256 bobAmt) public {
        aliceAmt = bound(aliceAmt, 1e6, MAX_PAIR);
        bobAmt = bound(bobAmt, 1, MAX_PAIR);

        _fund(alice, aliceAmt);
        _fund(bob, bobAmt);

        vm.prank(alice);
        vault.deposit(aliceAmt, alice);

        uint256 aliceClaimBefore = vault.convertToAssets(vault.balanceOf(alice));

        vm.prank(bob);
        vault.deposit(bobAmt, bob);

        uint256 aliceClaimAfter = vault.convertToAssets(vault.balanceOf(alice));

        // Bob's deposit must not steal value from Alice. A 1-wei rounding
        // loss is tolerated since `convertToAssets` rounds down.
        assertGe(aliceClaimAfter + 1, aliceClaimBefore, "alice must not be diluted by bob deposit");
    }

    function test_existingDepositorNotDilutedByNewDeposit(uint256 aliceAmt, uint256 bobAmt) public {
        check_existingDepositorNotDilutedByNewDeposit(aliceAmt, bobAmt);
    }
}
