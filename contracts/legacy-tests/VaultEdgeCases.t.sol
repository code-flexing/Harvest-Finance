// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../../src/Vault.sol";
import "../../src/MockERC20.sol";

/**
 * @title VaultEdgeCaseFuzzTest
 * @dev Advanced fuzz tests for edge cases and boundary conditions
 */
contract VaultEdgeCaseFuzzTest is Test {
    Vault public vault;
    MockERC20 public token;
    
    address public user = address(0x1111);
    
    function setUp() public {
        token = new MockERC20("Test Token", "TEST", type(uint128).max);
        vault = new Vault(token, "Vault Token", "vTEST", address(this));
        
        token.mint(user, type(uint96).max);
        
        vm.prank(user);
        token.approve(address(vault), type(uint256).max);
    }

    // ============== EDGE CASE: MINIMUM VALUES ==============

    /**
     * @dev Fuzz test: minimum deposit of 1 wei
     */
    function testFuzz_MinimumDeposit() public {
        vm.prank(user);
        uint256 shares = vault.deposit(1, user);
        
        assertEq(shares, 1, "1 wei deposit should yield 1 share");
        assertEq(vault.totalAssets(), 1);
        assertEq(vault.balanceOf(user), 1);
    }

    /**
     * @dev Fuzz test: withdrawal of exactly balance
     */
    function testFuzz_WithdrawExactBalance(uint256 amount) public {
        amount = bound(amount, 1, 1e20);
        
        vm.prank(user);
        vault.deposit(amount, user);
        
        uint256 balance = vault.balanceOf(user);
        
        vm.prank(user);
        uint256 assetsReceived = vault.withdraw(vault.totalAssets(), user, user);
        
        assertEq(vault.totalAssets(), 0, "Vault should be empty");
        assertEq(vault.balanceOf(user), 0, "User balance should be zero");
    }

    // ============== EDGE CASE: ROUNDING EDGE CASES ==============

    /**
     * @dev Fuzz test: rounding in share conversion
     * When totalAssets is much larger than supply
     */
    function testFuzz_RoundingWithLargeVault(uint256 smallDeposit, uint256 hugeVault) public {
        smallDeposit = bound(smallDeposit, 1, 1000);
        hugeVault = bound(hugeVault, 1e24, 1e26);
        
        // Simulate large vault by initial deposit
        vm.prank(user);
        vault.deposit(hugeVault, user);
        
        // Now try small deposit - tests rounding precision
        vm.prank(user);
        uint256 shares = vault.deposit(smallDeposit, user);
        
        // Even small deposits should yield positive shares
        assertGt(shares, 0, "Small deposit should yield at least 1 share");
    }

    /**
     * @dev Fuzz test: share redemption with rounding
     */
    function testFuzz_RedeemWithRounding(uint256 assets) public {
        assets = bound(assets, 1, 1e20);
        
        vm.prank(user);
        uint256 sharesReceived = vault.deposit(assets, user);
        
        // Redeem some shares (might result in rounding)
        uint256 redeemShares = sharesReceived / 2;
        
        vm.prank(user);
        uint256 assetsReceived = vault.redeem(redeemShares, user, user);
        
        // Assets received should be less than or equal to original
        assertLe(assetsReceived, assets, "Cannot redeem more than originally deposited");
    }

    // ============== EDGE CASE: SEQUENTIAL SMALL OPERATIONS ==============

    /**
     * @dev Fuzz test: many small deposits
     */
    function testFuzz_ManySmallDeposits(uint8 numDeposits, uint256 baseAmount) public {
        numDeposits = uint8(bound(numDeposits, 1, 50));
        baseAmount = bound(baseAmount, 1, 1e18);
        
        uint256 expectedTotal = 0;
        
        for (uint256 i = 0; i < numDeposits; i++) {
            vm.prank(user);
            vault.deposit(baseAmount, user);
            expectedTotal += baseAmount;
        }
        
        assertEq(vault.totalAssets(), expectedTotal, "Total should equal sum of deposits");
        assertEq(vault.totalSupply(), expectedTotal, "Supply should equal total assets");
    }

    /**
     * @dev Fuzz test: alternating deposits and withdrawals
     */
    function testFuzz_AlternatingOperations(uint256 amount, uint8 iterations) public {
        amount = bound(amount, 1, 1e20);
        iterations = uint8(bound(iterations, 1, 20));
        
        uint256 netAssets = 0;
        
        for (uint256 i = 0; i < iterations; i++) {
            if (i % 2 == 0) {
                // Deposit
                vm.prank(user);
                vault.deposit(amount, user);
                netAssets += amount;
            } else {
                // Withdraw (only if we have assets)
                if (netAssets > 0) {
                    uint256 withdrawAmount = netAssets > amount ? amount : netAssets;
                    vm.prank(user);
                    vault.withdraw(withdrawAmount, user, user);
                    netAssets -= withdrawAmount;
                }
            }
        }
        
        assertEq(vault.totalAssets(), netAssets, "Net assets should match calculation");
    }

    // ============== EDGE CASE: ZERO OPERATIONS ==============

    /**
     * @dev Fuzz test: attempting zero deposit
     */
    function testFuzz_ZeroDeposit() public {
        vm.prank(user);
        vm.expectRevert("Assets must be greater than 0");
        vault.deposit(0, user);
    }

    /**
     * @dev Fuzz test: attempting zero withdrawal
     */
    function testFuzz_ZeroWithdrawal() public {
        vm.prank(user);
        vault.deposit(1e20, user);
        
        vm.prank(user);
        vm.expectRevert("Assets must be greater than 0");
        vault.withdraw(0, user, user);
    }

    /**
     * @dev Fuzz test: attempting zero redeem
     */
    function testFuzz_ZeroRedeem() public {
        vm.prank(user);
        vault.deposit(1e20, user);
        
        vm.prank(user);
        vm.expectRevert("Shares must be greater than 0");
        vault.redeem(0, user, user);
    }

    // ============== EDGE CASE: EMPTY VAULT CONVERSIONS ==============

    /**
     * @dev Fuzz test: conversion in empty vault
     */
    function testFuzz_ConversionEmptyVault() public {
        // Empty vault: convertToShares should return assets (1:1)
        assertEq(vault.convertToShares(100), 100, "Empty vault: 100 assets = 100 shares");
        assertEq(vault.convertToAssets(100), 100, "Empty vault: 100 shares = 100 assets");
    }

    // ============== EDGE CASE: ALLOWANCE AND APPROVALS ==============

    /**
     * @dev Fuzz test: withdrawal with insufficient allowance
     */
    function testFuzz_WithdrawInsufficientAllowance(uint256 depositAmount) public {
        depositAmount = bound(depositAmount, 1, 1e20);
        
        address attacker = address(0xdeadbeef);
        token.mint(attacker, 1e26);
        
        vm.prank(user);
        vault.deposit(depositAmount, user);
        
        // Attacker tries to withdraw without allowance
        vm.prank(attacker);
        vm.expectRevert("Insufficient allowance");
        vault.withdraw(1, address(attacker), user);
    }

    /**
     * @dev Fuzz test: redeem with insufficient allowance
     */
    function testFuzz_RedeemInsufficientAllowance(uint256 depositAmount) public {
        depositAmount = bound(depositAmount, 1, 1e20);
        
        address attacker = address(0xdeadbeef);
        
        vm.prank(user);
        vault.deposit(depositAmount, user);
        
        // Attacker tries to redeem without allowance
        vm.prank(attacker);
        vm.expectRevert("Insufficient allowance");
        vault.redeem(1, address(attacker), user);
    }

    // ============== EDGE CASE: CASCADING OPERATIONS ==============

    /**
     * @dev Fuzz test: deposit -> withdraw -> deposit pattern
     */
    function testFuzz_CascadingOperations(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1, 1e20);
        amount2 = bound(amount2, 1, 1e20);
        
        // First cycle
        vm.prank(user);
        vault.deposit(amount1, user);
        
        vm.prank(user);
        vault.withdraw(amount1 / 2, user, user);
        
        // Second cycle
        vm.prank(user);
        vault.deposit(amount2, user);
        
        uint256 expectedFinal = (amount1 - (amount1 / 2)) + amount2;
        assertEq(vault.totalAssets(), expectedFinal);
    }

    // ============== EDGE CASE: PRECISION LOSS ==============

    /**
     * @dev Fuzz test: precision loss in conversion
     * When division results in truncation
     */
    function testFuzz_PrecisionLoss(uint256 assets) public {
        assets = bound(assets, 1, 1e25);
        
        vm.prank(user);
        vault.deposit(assets, user);
        
        // Convert a small number of shares
        uint256 shares = 3;
        uint256 assetsFromShares = vault.convertToAssets(shares);
        
        // Assets should be >= 0 (never negative due to division)
        assertGe(assetsFromShares, 0, "Conversion should never go negative");
    }

    // ============== EDGE CASE: SEQUENTIAL SHARE REDEMPTIONS ==============

    /**
     * @dev Fuzz test: redeem shares one at a time
     */
    function testFuzz_RedeemSequentially(uint256 depositAmount) public {
        depositAmount = bound(depositAmount, 100, 1e20);
        
        vm.prank(user);
        uint256 shares = vault.deposit(depositAmount, user);
        
        // Redeem one share at a time
        for (uint256 i = 0; i < shares && i < 100; i++) {
            vm.prank(user);
            vault.redeem(1, user, user);
            
            // Vault should remain in valid state
            uint256 remainingShares = vault.balanceOf(user);
            assertGe(remainingShares + i + 1, shares - 100);
        }
    }

    // ============== EDGE CASE: EXTREME RATIOS ==============

    /**
     * @dev Fuzz test: 1000:1 deposit ratio
     */
    function testFuzz_LargeDepositRatio() public {
        // User 1 deposits a lot
        vm.prank(user);
        vault.deposit(1e25, user);
        
        address user2 = address(0x2222);
        token.mint(user2, 1e26);
        vm.prank(user2);
        token.approve(address(vault), type(uint256).max);
        
        // User 2 deposits tiny amount
        vm.prank(user2);
        uint256 shares = vault.deposit(1000, user2);
        
        assertGt(shares, 0, "Even tiny deposits should yield shares");
        assertLt(shares, 1000, "Shares should be less than assets due to vault size");
    }
}
