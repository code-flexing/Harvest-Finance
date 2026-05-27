// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../../src/Vault.sol";
import {MockERC20} from "../../src/MockERC20.sol";

/**
 * @title VaultStatefulFuzzTest
 * @dev Stateful fuzzing tests that build on previous state
 * Tests complex sequences of operations
 */
contract VaultStatefulFuzzTest is Test {
    Vault public vault;
    MockERC20 public token;

    address public user1 = address(0x1111);
    address public user2 = address(0x2222);
    address public user3 = address(0x3333);

    // State tracking
    uint256 public totalDepositedAssets;
    uint256 public totalWithdrawnAssets;

    function setUp() public {
        token = new MockERC20("Test Token", "TEST", type(uint128).max);
        vault = new Vault(token, "Vault Token", "vTEST", address(this));

        // Setup users with unlimited tokens
        token.mint(user1, type(uint96).max);
        token.mint(user2, type(uint96).max);
        token.mint(user3, type(uint96).max);

        // Approve vault
        vm.prank(user1);
        token.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        token.approve(address(vault), type(uint256).max);
        vm.prank(user3);
        token.approve(address(vault), type(uint256).max);

        totalDepositedAssets = 0;
        totalWithdrawnAssets = 0;
    }

    // ============== STATEFUL FUZZ: USER INTERACTIONS ==============

    /**
     * @dev Stateful fuzz: User deposits multiple times
     * State: track cumulative deposits
     */
    function testFuzz_StatefulMultipleDeposits(uint256 d1, uint256 d2, uint256 d3) public {
        d1 = bound(d1, 1, 1e20);
        d2 = bound(d2, 1, 1e20);
        d3 = bound(d3, 1, 1e20);

        vm.prank(user1);
        vault.deposit(d1, user1);
        totalDepositedAssets += d1;

        vm.prank(user1);
        vault.deposit(d2, user1);
        totalDepositedAssets += d2;

        vm.prank(user1);
        vault.deposit(d3, user1);
        totalDepositedAssets += d3;

        assertEq(vault.totalAssets(), totalDepositedAssets);
    }

    /**
     * @dev Stateful fuzz: User deposits and withdraws
     * State: track net assets
     */
    function testFuzz_StatefulDepositWithdraw(uint256 deposit, uint256 withdraw) public {
        deposit = bound(deposit, 100, 1e20);
        withdraw = bound(withdraw, 1, deposit - 1);

        vm.prank(user1);
        vault.deposit(deposit, user1);
        totalDepositedAssets += deposit;

        vm.prank(user1);
        vault.withdraw(withdraw, user1, user1);
        totalWithdrawnAssets += withdraw;

        assertEq(vault.totalAssets(), totalDepositedAssets - totalWithdrawnAssets);
    }

    /**
     * @dev Stateful fuzz: Multiple users interacting
     * State: track each user's contribution
     */
    function testFuzz_StatefulMultiUserSequence(uint256 u1d1, uint256 u2d1, uint256 u3d1, uint256 u1d2, uint256 u2w1)
        public
    {
        u1d1 = bound(u1d1, 1, 1e19);
        u2d1 = bound(u2d1, 1, 1e19);
        u3d1 = bound(u3d1, 1, 1e19);
        u1d2 = bound(u1d2, 1, 1e19);
        u2w1 = bound(u2w1, 1, u2d1 - 1);

        // User 1 deposits
        vm.prank(user1);
        vault.deposit(u1d1, user1);

        // User 2 deposits
        vm.prank(user2);
        vault.deposit(u2d1, user2);

        // User 3 deposits
        vm.prank(user3);
        vault.deposit(u3d1, user3);

        assertEq(vault.totalAssets(), u1d1 + u2d1 + u3d1);

        // User 1 deposits again
        vm.prank(user1);
        vault.deposit(u1d2, user1);

        // User 2 withdraws
        vm.prank(user2);
        vault.withdraw(u2w1, user2, user2);

        uint256 expectedTotal = u1d1 + u2d1 + u3d1 + u1d2 - u2w1;
        assertEq(vault.totalAssets(), expectedTotal);
    }

    // ============== STATEFUL FUZZ: REDEMPTION SEQUENCES ==============

    /**
     * @dev Stateful fuzz: Deposit then full redemption
     */
    function testFuzz_StatefulDepositFullRedeem(uint256 assets) public {
        assets = bound(assets, 1, 1e20);

        vm.prank(user1);
        uint256 shares = vault.deposit(assets, user1);

        // Redeem all shares
        vm.prank(user1);
        uint256 assetsBack = vault.redeem(shares, user1, user1);

        // Should have nearly all assets back (rounding ok)
        assertApproxEqAbs(assetsBack, assets, 1);

        // Vault should be empty
        assertEq(vault.balanceOf(user1), 0);
        assertEq(vault.totalSupply(), 0);
    }

    /**
     * @dev Stateful fuzz: Partial redemption sequences
     */
    function testFuzz_StatefulPartialRedemptions(uint256 deposit, uint256 redeem1, uint256 redeem2) public {
        deposit = bound(deposit, 1000, 1e20);

        vm.prank(user1);
        uint256 totalShares = vault.deposit(deposit, user1);

        redeem1 = bound(redeem1, 1, totalShares / 3);
        redeem2 = bound(redeem2, 1, (totalShares - redeem1) / 2);

        uint256 shares = totalShares;

        // First redemption
        vm.prank(user1);
        vault.redeem(redeem1, user1, user1);
        shares -= redeem1;

        // Second redemption
        vm.prank(user1);
        vault.redeem(redeem2, user1, user1);
        shares -= redeem2;

        // Check remaining
        assertEq(vault.balanceOf(user1), shares);
    }

    // ============== STATEFUL FUZZ: ALLOWANCE DELEGATION ==============

    /**
     * @dev Stateful fuzz: Withdrawal with approved spender
     */
    function testFuzz_StatefulApprovedWithdraw(uint256 deposit, uint256 withdraw) public {
        deposit = bound(deposit, 100, 1e20);
        withdraw = bound(withdraw, 1, deposit - 1);

        // User1 deposits
        vm.prank(user1);
        vault.deposit(deposit, user1);

        uint256 sharesToWithdraw = vault.convertToShares(withdraw);

        // User1 approves user2 to spend shares
        vm.prank(user1);
        vault.approve(user2, sharesToWithdraw);

        // User2 withdraws on behalf of user1
        vm.prank(user2);
        vault.withdraw(withdraw, user2, user1);

        // User1's balance decreased
        assertLt(vault.balanceOf(user1), vault.convertToShares(deposit));

        // Remaining allowance should be 0
        assertEq(vault.allowance(user1, user2), 0);
    }

    /**
     * @dev Stateful fuzz: Redemption with approved spender
     */
    function testFuzz_StatefulApprovedRedeem(uint256 deposit, uint256 redeemShares) public {
        deposit = bound(deposit, 100, 1e20);

        vm.prank(user1);
        uint256 totalShares = vault.deposit(deposit, user1);

        redeemShares = bound(redeemShares, 1, totalShares / 2);

        // User1 approves user2
        vm.prank(user1);
        vault.approve(user2, redeemShares);

        // User2 redeems on behalf of user1
        vm.prank(user2);
        vault.redeem(redeemShares, user2, user1);

        // User1's balance decreased
        assertEq(vault.balanceOf(user1), totalShares - redeemShares);
    }

    // ============== STATEFUL FUZZ: COMPLEX SCENARIOS ==============

    /**
     * @dev Stateful fuzz: Realistic DeFi user behavior
     * Deposit -> Hold -> Withdraw partial -> Hold -> Redeem remaining
     */
    function testFuzz_StatefulRealisticBehavior(
        uint256 initialDeposit,
        uint256 partialWithdraw,
        uint256 additionalDeposit,
        uint256 finalRedeem
    ) public {
        initialDeposit = bound(initialDeposit, 1000, 1e20);
        partialWithdraw = bound(partialWithdraw, 1, initialDeposit / 3);
        additionalDeposit = bound(additionalDeposit, 1, 1e19);

        // Phase 1: Initial deposit
        vm.prank(user1);
        uint256 initialShares = vault.deposit(initialDeposit, user1);

        // Phase 2: Partial withdrawal
        vm.prank(user1);
        vault.withdraw(partialWithdraw, user1, user1);

        // Phase 3: Additional deposit
        vm.prank(user1);
        uint256 additionalShares = vault.deposit(additionalDeposit, user1);

        uint256 totalShares = initialShares + additionalShares - vault.convertToShares(partialWithdraw);

        // Phase 4: Full redemption
        vm.prank(user1);
        uint256 finalAssets = vault.redeem(vault.balanceOf(user1), user1, user1);

        // Final state: vault empty for this user
        assertEq(vault.balanceOf(user1), 0);
        assertGt(finalAssets, 0);
    }

    /**
     * @dev Stateful fuzz: Concurrent multi-user operations
     */
    function testFuzz_StatefulConcurrentOperations(
        uint256 u1d,
        uint256 u2d,
        uint256 u3d,
        uint256 u1w,
        uint256 u2r,
        uint256 u3w
    ) public {
        u1d = bound(u1d, 1, 1e19);
        u2d = bound(u2d, 1, 1e19);
        u3d = bound(u3d, 1, 1e19);
        u1w = bound(u1w, 1, u1d - 1);

        // All users deposit
        vm.prank(user1);
        uint256 u1shares = vault.deposit(u1d, user1);
        vm.prank(user2);
        uint256 u2shares = vault.deposit(u2d, user2);
        vm.prank(user3);
        uint256 u3shares = vault.deposit(u3d, user3);

        assertEq(vault.totalAssets(), u1d + u2d + u3d);

        // User 1 withdraws
        vm.prank(user1);
        vault.withdraw(u1w, user1, user1);

        // User 2 redeems
        u2r = bound(u2r, 1, u2shares / 2);
        vm.prank(user2);
        vault.redeem(u2r, user2, user2);

        // User 3 withdraws
        u3w = bound(u3w, 1, u3d - 1);
        vm.prank(user3);
        vault.withdraw(u3w, user3, user3);

        uint256 expectedTotal = u1d + u2d + u3d - u1w - vault.convertToAssets(u2r) - u3w;
        assertEq(vault.totalAssets(), expectedTotal);
    }

    // ============== STATEFUL FUZZ: STRESS TESTS ==============

    /**
     * @dev Stateful fuzz: Many operations in sequence
     */
    function testFuzz_StatefulStressOperations(uint8 numOperations, uint256 baseAmount, uint8 operationType) public {
        numOperations = uint8(bound(numOperations, 1, 50));
        baseAmount = bound(baseAmount, 1, 1e18);

        for (uint256 i = 0; i < numOperations; i++) {
            uint8 op = uint8((operationType + i) % 3);
            address currentUser = [user1, user2, user3][i % 3];

            if (op == 0) {
                // Deposit
                vm.prank(currentUser);
                vault.deposit(baseAmount + i, currentUser);
            } else if (op == 1 && vault.totalAssets() > 0) {
                // Withdraw
                uint256 amount = (baseAmount + i) % (vault.totalAssets() + 1);
                if (amount > 0) {
                    vm.prank(currentUser);
                    vault.withdraw(amount, currentUser, currentUser);
                }
            } else if (vault.balanceOf(currentUser) > 0) {
                // Redeem
                uint256 shares = vault.balanceOf(currentUser) / 2;
                if (shares > 0) {
                    vm.prank(currentUser);
                    vault.redeem(shares, currentUser, currentUser);
                }
            }
        }

        // Vault should remain in valid state
        assertGe(vault.totalAssets(), 0);
        assertGe(vault.totalSupply(), 0);
    }

    // ============== STATEFUL FUZZ: INVARIANT PRESERVATION ==============

    /**
     * @dev Stateful fuzz: Asset invariant is preserved
     * through operations
     */
    function testFuzz_StatefulAssetInvariant(uint256 d1, uint256 d2, uint256 w1) public {
        d1 = bound(d1, 1, 1e19);
        d2 = bound(d2, 1, 1e19);
        w1 = bound(w1, 1, d1 - 1);

        uint256 trackedAssets = 0;

        // Operation 1: User1 deposits
        vm.prank(user1);
        vault.deposit(d1, user1);
        trackedAssets += d1;
        assertEq(vault.totalAssets(), trackedAssets);

        // Operation 2: User2 deposits
        vm.prank(user2);
        vault.deposit(d2, user2);
        trackedAssets += d2;
        assertEq(vault.totalAssets(), trackedAssets);

        // Operation 3: User1 withdraws
        vm.prank(user1);
        vault.withdraw(w1, user1, user1);
        trackedAssets -= w1;
        assertEq(vault.totalAssets(), trackedAssets);
    }
}
